module.exports = MemoDB;

var path = require("path");
var fs = require("fs");
var moment = require("moment");
var jsext = require("jsext");
var MemoCache = require("memocache");

var MemoRouter = require("./memorouter");


/**
 * MemoDB
 */
function MemoDB (options) {
    var self = this;
    self.options = Object.assign({}, self.DEFAULTOPTIONS, options);
    self.mcache = self.options.mcache || new MemoCache({
        maxSize:5000000,
        alertRatio : 0.9,
        alertCallback : function(stats) {
            console.log("MEMO : alert memory usage ", stats);
        }
    });
    self.router = new MemoRouter(self);
    self.TYPE = self.options.type;
    if(!self.TYPE) throw new Error("missing required type name");
    self.SCHEMA = self.options.schema;
    if(!self.SCHEMA) throw new Error("missing required SCHEMA name");
    self.SCHEMADEFAULT = self.options.schemadefault;
    if(!self.SCHEMADEFAULT) throw new Error("missing required SCHEMADEFAULT function");

    assertStoreDir(self);
}

MemoDB.ERROR = {
    MISSING_PARAMS : "Missing required params",
    LOADINGFILE : "Can not load the memo",
    NOTFOUND : "Can not find the memo",
    DUPLICATE : "Duplicate entry",
    CLONE : "Bad clone response"
};

MemoDB.MESSAGE = {
    SUCCESS : "Operation success"
};

MemoDB.prototype.DEFAULTOPTIONS = {
    type : "memo",
    autoid : false,
    schema : {
        id : String,
        content : String,
        author : String,
        status : String,
        since : Date,
        lastupdate : Date
    },
    schemadefault : function() {
        return {
            since : moment(),
            lastupdate : moment(),
            status : "PUBLIC",
            content : "",
            author : ""
        };
    },
    memopath : "memo",
    mcache : null
};

/**
 * schema Return the scheme serialized as string
 * @return {String} Serialized schema
 */
MemoDB.prototype.schema = function() {
    var self = this;
    var props = Object.keys(self.SCHEMA);
    var descParts = props.map(function(propname) {
        var prop = self.SCHEMA[propname];
        return propname + ":" + typeof(prop);
    });
    return "{" + descParts.join(", ") + "}";
}

/**
 * create Create a new memo and save it
 * @param {Object} memo
 * @return {Promise} Responses as reject({error:String, memo:String}) or resolve(newmemo) 
 */
MemoDB.prototype.create = function(memo) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!assertMemo(self, memo)) return reject({error:MemoDB.ERROR.MISSING_PARAMS, memo:memo});

        var exists = self.exists(memo.id);
        if(exists) return reject({error:MemoDB.ERROR.DUPLICATE, memo:memo});

        var newmemo = Object.assign({type:self.TYPE}, self.SCHEMADEFAULT(), memo).pick(self.SCHEMA);
        var memofile = self.getStoreFilename(newmemo.id);
        jsext.saveJsonFile(memofile, newmemo, 3)
        .then(function(memocontent) { 
            return resolve(newmemo); 
        })
        .catch(reject);
    });
}

/**
 * rename Rename a memo from originalId to destId
 * @param {String} originId Original memo id to rename
 * @param {String} destId Destination memo id
 * @return {Promise} Responses as reject({error:String, memo:String}) or resolve(newmemo) 
 */
MemoDB.prototype.rename = function(originId, destId) {
    var self = this;
    return new Promise(function(resolve, reject) {
        var destMemo;

        self.clone(originId, destId)
        .then(function(newmemo) {
            if(!newmemo) return reject({error:MemoDB.ERROR.CLONE, origin:originId, destination:destId});

            destMemo = newmemo;
            return self.remove(originId);
        })
        .then(function(originMemo) {
            if(!originMemo) return reject({error:MemoDB.ERROR.REMOVE, origin:originId, destination:destId});

            resolve(destMemo);
        })
        .catch(reject);
    });
}

/**
 * clone Clone an existent memo and save the copy in base
 * @param {String} originId Original memo id to copy
 * @param {String} cloneId Clone id
 * @param {MemoDB.Scheme} changes Memo properties to overwrite the origin properties
 * @return {Promise} Responses as reject({error:String, memo:String}) or resolve(newmemo) 
 */
MemoDB.prototype.clone = function(originId, cloneId, changes) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!originId || !cloneId) return reject({error:MemoDB.ERROR.MISSING_PARAMS, origin:originId, cloneid:cloneId});

        self.get(originId)
        .then(function(memo) {
            var cloneMemo = Object.assign({}, memo, changes);
            cloneMemo.id = cloneId;
            return self.create(cloneMemo);
        })
        .then(resolve)
        .catch(reject);
    });
}

/**
 * update Update a memo and save it
 * @param {MemoDB.Scheme} memo
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memo) 
 */
MemoDB.prototype.update = function (memo) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!memo || !memo.id) return reject({error:MemoDB.ERROR.MISSING_PARAMS, memo:memo});

        self.get(memo.id)
        .then(function(oldMemo) {
            if(oldMemo) memo = Object.assign({}, oldMemo, memo, {lastupdate : moment()});

            return self.remove(memo.id);
        })
        .then(function (backuped) {
            return self.create(memo);
        })
        .then(resolve)
        .catch(reject);
    });
}

/**
 * stock Create or update a memo by id
 * @param {MemoDB.Scheme} memo
 * @param {Bool} merge True to update if it is an existent memo by merging changes in memo
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memo) 
 */
MemoDB.prototype.stock = function (memo, merge) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if(!memo) return reject({error:MemoDB.ERROR.MISSING_PARAMS, memo:memo});

        if(!memo.id || self.exists(memo.id)) {
            if(merge) {
                self.update(memo).then(resolve, reject);
            } else {
                resolve(memo.id);
            }
        } else {
            self.create(memo).then(resolve, reject);
        }
    });
}

/**
 * remove Remove an existent memo by it's id
 * @param {String} id
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memo)
 */
MemoDB.prototype.remove = function (id, ignoreError) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var removedMemo = null;
        self.get(id, null, ignoreError)
        .then(function (memo) {
            if(!memo) {
                if(ignoreError) return;
                return reject({error:MemoDB.ERROR.NOTFOUND,id:id});
            }

            removedMemo = memo;
            return self.backup(id);
        })
        .then(function(backupentry) {
            self.unstore(id);
            resolve(removedMemo);
        })
        .catch(function(err) {
            if(ignoreError) return resolve();

            reject(err);
        });
    });
}

/**
 * removeAll Remove all memo existent entries
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memo)
 */
MemoDB.prototype.removeAll = function () {
    var self = this;
    var keys = self.keys();
    return self.removeList(keys);
}

/**
 * removeList Remove memo entries in list from base
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memos)
 */
MemoDB.prototype.removeList = function (list) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!list) return reject({error:MemoDB.ERROR.MISSING_PARAMS,list:list});

        var ignoreError = true;
        var tasks = list.map(function(id) {
            return self.remove(id, ignoreError);
        });
        Promise.all(tasks)
        .then(function(taskResponses) {
            resolve(taskResponses.clean());
        })
        .catch(function(taskFail) {
            return tasks;
        });
    });
}

/**
 * exists Verify if there is a existent memo with the same id
 * @param {Object} memo
 * @return {boolean}
 */
MemoDB.prototype.exists = function(id) {
    var self = this;
    var cached = self.cache(id);
    if(cached) return true;

    var memofile = self.getStoreFilename(id);
    return jsext.fileExists(memofile);
}

/**
 * get Returns the memo by its id from cache or load it
 * @param {String} id
 * @param {Array} props Array of keys to filter the response memo
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memo) 
 */
MemoDB.prototype.get = function(id, props, ignoreError) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!id) return reject({error:MemoDB.ERROR.MISSING_PARAMS, id:id});

        var cached = self.cache(id);
        if(cached) return resolve(cached.pick(props));

        self.load(id)
        .then(function(memo) {
            return resolve(memo.pick(props));
        })
        .catch(function(err) {
            if(ignoreError) return resolve();

            reject(err);
        });
    });
}

/**
 * getList Get a list of memo entries
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memos)
 */
MemoDB.prototype.getList = function (list, props) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!list) return reject({error:MemoDB.ERROR.MISSING_PARAMS,list:list});

        var ignoreError = true;
        var tasks = list.map(function(id) {
            return self.get(id, props, ignoreError);
        });
        Promise.all(tasks)
        .then(function(taskResponses) {
            resolve(taskResponses.clean());
        })
        .catch(reject);
    });
}

/**
 * load Loads the memo by it's id
 * @param {String} id
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memo) 
 */
MemoDB.prototype.load = function(id) {
    var self = this;
    return new Promise(function(resolve, reject) {
        if(!id) return reject({error:MemoDB.ERROR.MISSING_PARAMS, id:id});

        var memofile = self.getStoreFilename(id);
        var loaded = jsext.loadJsonFile(memofile);
        if(!loaded) return reject({error:MemoDB.ERROR.NOTFOUND,file:memofile});

        self.store(id, loaded);

        resolve(loaded);
    });
}

/**
 * backup Backup an existent memo by it's id
 * @param {String} id
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(backupfile) 
 */
MemoDB.prototype.backup = function (id) {
    var self = this;
    var memofile = self.getStoreFilename(id);
    return jsext.renameOverwrite(memofile, memofile + ".old");
}

/**
 * cache Retrieve a memo from cache
 * @param {String} id
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memo) 
 */
MemoDB.prototype.cache = function (id) {
    var self = this;
    var cachekey = self.getStoreKey(id);
    return self.mcache.get(cachekey);
}

/**
 * store Stores a memo into a cache
 * @param {String} id
 * @param {MemoDB.Scheme} memo
 * @return {boolean} True if it was well stored of false otherwise
 */
MemoDB.prototype.store = function (id, memo) {
    var self = this;
    var cachekey = self.getStoreKey(id);
    return self.mcache.set(cachekey, memo);
}

/**
 * unstore Unstores a memo cache
 * @param {String} id
 */
MemoDB.prototype.unstore = function (id) {
    var self = this;
    var cachekey = self.getStoreKey(id);
    return self.mcache.del(cachekey);
}

/**
 * getStoreKey Returns a string key with memo id and memo type
 * @param {String} id
 * @return {String} The memo key
 */
MemoDB.prototype.getStoreKey = function (id) {
    var self = this;
    if(!id) return;
    return id + self.getStoreExt();
}

/**
 * getStoreExt Returns a string with memo extension
 * @param {String} id
 * @return {String} The memo key
 */
MemoDB.prototype.getStoreExt = function () {
    var self = this;
    return "." + self.TYPE;
}

/**
 * getStoreFilename Build and return a string memo filename where it is stored
 * @param {String} id
 * @return {String} The memo filename
 */
MemoDB.prototype.getStoreFilename = function (id) {
    var self = this;
    var memokey = self.getStoreKey(id);
    return path.normalize(path.join(self.options.memopath, memokey));
}

/**
 * random Get a random list of memo
 * @param where Criteria object
 * @param count Number
 * @return {Promise} Responses as reject({error:String, id:String}) or resolve(memo) 
 */
MemoDB.prototype.random = function (count, props) {
    var self = this;
    count = count || 1;
    return new Promise(function (resolve, reject) {
        var keys = self.keys();
        var sampled = keys.sample(count);

        return self.getList(sampled, props).then(resolve, reject);
    });
}

/**
 * keys Return a list of ids in base
 * @return {Array} List of ids
 */
MemoDB.prototype.keys = function () {
    var self = this;
    var entries = jsext.listDir(self.options.memopath, self.TYPE);
    var ext = self.getStoreExt();
    return entries && entries.map(function(entry) {
        return path.basename(entry, ext);
    });
}

/**
 * count Return number of ids in base
 * @return {Number} List of id
 */
MemoDB.prototype.count = function () {
    var self = this;
    var keys = self.keys();
    return keys && keys.length;
}

/**
 * find Search for the memos that match with where conditions by a logic comparation OR or AND
 * @param {Object} where Object that has the same keys in schema associated with values to test against the memo property.
 * @param {String} logic AND|OR. 
 *                       In the case of AND all where properties must be satisfied, 
 *                       and in the case of OR only one property must to be satisfied to include a memo into the search response.
 * @return {Promise} Responses as reject({error:String}) or resolve([memo]) 
 */
MemoDB.prototype.find = function (where, logic, props) {
    var self = this;
    logic = logic || "AND";
    where = where && where.pick(Object.keys(self.SCHEMA));
    return new Promise(function(resolve, reject) {
        var keys = self.keys()
        var tasks = keys.map(function(key) {
            return self.get(key, props)
            .then(function(memo) {
                var isInSearch = (logic == "AND") ? verifyLogicAnd(where, memo) : verifyLogicOr(where, memo);
                return isInSearch && memo || null;
            });
        });
        Promise.all(tasks)
        .then(function(taskResponse) {
            return taskResponse.clean();
        })
        .then(resolve)
        .catch(reject);
    });
}



// PRIVATE FUNCTIONS

function assertStoreDir (self) {
    jsext.mkdirRecursive(self.options.memopath);
}

function assertMemo (self, memo) {
    if(!self || !memo) return false;

    if(!self.options.autoid && !memo.id) return false;

    if(!memo.id) memo.id = moment().format("YYYYMMDDhhmmssSSSS");
    return true;
}

function verifyLogicOr (where, memo) {
    var whereKeys = Object.keys(where);
    var hasWhereKeys = where && whereKeys && whereKeys.length;
    if(!memo) return false;
    if(!hasWhereKeys) return true;

    for(var i = 0; i < whereKeys.length ; ++i) {
        var key = whereKey[i];
        var whereKey = where[key];
        if(typeof(whereKey) == "function") {
            if(whereKey(memo[key]))
                return true;
        } else {
            if(memo[key] == whereKey)
                return true;
        } 
    }
    return false;
}

function verifyLogicAnd (where, memo) {
    var whereKeys = Object.keys(where);
    var hasWhereKeys = where && whereKeys && whereKeys.length && true;
    if(!memo) return false;
    if(!hasWhereKeys) return true;

    for(var i = 0; i < whereKeys.length ; ++i) {
        var key = whereKeys[i];
        var whereKey = where[key];
        var memoVal = memo[key];
        if(typeof(whereKey) == "function") {
            if(!whereKey(memoVal)) 
                return false;
        } else {
            if(memoVal != whereKey)
                return false;
        } 
    }
    return true;
}