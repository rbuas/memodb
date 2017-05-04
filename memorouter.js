module.exports = MemoRouter;

var path = require("path");
var jsext = require("jsext");

var MemoDB = require("./memodb");

function MemoRouter (mdb) {
    var self = this;
    self.mdb = mdb;
}

MemoRouter.prototype.memoParam = function (param) {
    var self = this;
    return function (req, res, next, memo) {
        var memoparam = param || self.mdb.TYPE;
        var memoparamid = param || self.mdb.TYPE + "id";
        var memoid = req.params[memoparam] || memo;
        if(!memoid) return next();

        self.mdb.get(memoid)
        .then(function(memo) {
            req[memoparamid] = memoid;
            req[memoparam] = memo;
            next();
        })
        .catch(function(error){
            req[memoparamid] = memoid;
            req[memoparam] = null;
            req[memoparam + "error"] = error;
            next();
        });
    };
}

MemoRouter.prototype.get = function () {
    var self = this;
    return function (req, res) {
        //prepare params
        var memoid = req.params[self.mdb.TYPE];
        var pick = req.params.pick && req.params.pick.split("|");

        //call api
        self.mdb.get(memoid, pick)
        .then(function(memo) {
            var response = {status:"SUCCESS"};
            response[self.mdb.TYPE] = memo;
            res.json(response);
        })
        .catch(function(err) {
            res.json({status:"ERROR", error:"creation error : " + (err && err.error)});
        });
    }
}

MemoRouter.prototype.create = function () {
    var self = this;
    return function (req, res) {
        //prepare params
        var memo = req.body[self.mdb.TYPE];

        //call api
        self.mdb.create(memo)
        .then(function(savedMemo) {
            var response = {status:"SUCCESS"};
            res.json(response);
        })
        .catch(function(err) {
            var response = {status:"ERROR", error:"operation error : " + (err && err.error)};
            res.json(response);
        });
    }
}

MemoRouter.prototype.clone = function () {
    var self = this;
    return function (req, res) {
        //prepare params
        var memoid = req.params[self.mdb.TYPE];
        var cloneid = req.params.clone;

        //call api
        self.mdb.clone(memoid, cloneid)
        .then(function(clone) {
            var response = {status:"SUCCESS"};
            response[self.mdb.TYPE] = memo;
            res.json(response);
        })
        .catch(function(err) {
            var response = {status:"ERROR", error:"creation error : " + (err && err.error)};
            res.json(response);
        });
    }
}

MemoRouter.prototype.update = function () {
    var self = this;
    return function (req, res) {
        //prepare params
        var memo = req.body[self.mdb.TYPE];
        var changes = req.body.changes;

        //call api
        self.mdb.update(memo)
        .then(function(savedMemo) {
            var response = {status:"SUCCESS"};
            response[self.mdb.TYPE] = savedMemo;
            res.json(response);
        })
        .catch(function(err) {
            var response = {status:"ERROR", error:"creation error : " + (err && err.error)};
            res.json(response);
        });
    }
}

MemoRouter.prototype.remove = function () {
    var self = this;
    return function (req, res) {
        //prepare params
        var memoid = req.params[self.mdb.TYPE];

        //call api
        self.mdb.remove(memoid)
        .then(function(removedMemo) {
            var response = {status:"SUCCESS"};
            response[self.mdb.TYPE] = removedMemo;
            res.json(response);
        })
        .catch(function(err) {
            var response = {status:"ERROR", error:"creation error : " + (err && err.error)};
            res.json(response);
        });
    }
}

MemoRouter.prototype.removeList = function () {
    var self = this;
    return function (req, res) {
        //prepare params
        var memoList = req.body.list;

        //call api
        self.mdb.removeList(memoList)
        .then(function(removedList) {
            var response = {status:"SUCCESS"};
            response[self.mdb.TYPE + "s"] = removedList;
            res.json(response);
        })
        .catch(function(err) {
            var response = {status:"ERROR", error:"creation error : " + (err && err.error)};
            res.json(response);
        });
    }
}

MemoRouter.prototype.getList = function () {
    var self = this;
    return function (req, res) {
        //prepare params
        var memoparam = req.params[self.mdb.TYPE + "list"];
        var memolist = memoparam.split("|");
        var pick = req.params.pick && req.params.pick.split("|");

        //call api
        self.mdb.getList(memolist, pick)
        .then(function(memos) {
            var response = {status:"SUCCESS"};
            response[self.mdb.TYPE + "s"] = memos;
            res.json(response);
        })
        .catch(function(err) {
            var response = {status:"ERROR", error:"operation error : " + (err && err.error)};
            res.json(response);
        });
    }
}

MemoRouter.prototype.random = function () {
    var self = this;
    return function (req, res) {
        //prepare params
        var count = req.params.count || 1;
        var pick = req.params.pick && req.params.pick.split("|");

        //call api
        self.mdb.random(count, pick)
        .then(function(memos) {
            var response = {status:"SUCCESS"};
            response[self.mdb.TYPE + "s"] = memos;
            res.json(response);
        })
        .catch(function(err) {
            var response = {status:"ERROR", error:"operation error : " + (err && err.error)};
            res.json(response);
        });
    }
}

MemoRouter.prototype.keys = function () {
    var self = this;
    return function (req, res) {
        //call api
        var keys = self.mdb.keys();
        var response = {status:"SUCCESS", keys:keys};
        res.json(response);
    }
}

MemoRouter.prototype.count = function () {
    var self = this;
    return function (req, res) {
        //call api
        var count = self.mdb.count();
        var response = {status:"SUCCESS", count:count};
        res.json(response);
    }
}