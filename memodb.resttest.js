global.ROOT_DIR = process.cwd() || __dirname;

var expect = require("chai").expect;
var express = require("express");
var MemoCache = require("memocache");
var RestTest = require("resttest");

var MemoDB = require("./memodb");
var MemoRouter = require("./memorouter");

/////////////
// TESTCLASS : MemoRestTest
///////
MemoRestTest.extends( RestTest );
function MemoRestTest (options) {
    var self = this;
    RestTest.call(this, options);
    self.app = express();
    self.router = express.Router();
    self.mcache = new MemoCache({
        maxSize:5000000,
        alertRatio : 0.9,
        alertCallback : function(stats) {
            console.log("MEMORESTTEST::WARNING : memory was attempt next to the limit : ", stats);
        }
    });
    self.memodb = new MemoDB({mcache:self.mcache, memopath:ROOT_DIR + "/test/memo", type:"memo"});
    self.memoRouter = new MemoRouter(self.memodb);
    self.router.param("memo", self.memoRouter.memoParam());
    self.router.get("/keys", self.memoRouter.keys());
    self.router.get("/count", self.memoRouter.count());
    self.router.get("/get/:memo/:pick?", self.memoRouter.get());
    self.router.get("/getlist/:memolist/:pick?", self.memoRouter.getList());
    self.router.get("/random/:count?/:pick?", self.memoRouter.random());
    self.router.post("/create", self.memoRouter.create());
    self.router.get("/clone/:memo/:clone", self.memoRouter.clone());
    self.router.post("/update", self.memoRouter.update());
    self.router.get("/remove/:memo", self.memoRouter.remove());
    self.router.post("/removelist", self.memoRouter.removeList());
    self.app.use("/", self.router);
    self.server = self.app.listen(self.options.port || 3000, function(){
        console.log("Test server live at port " + (self.options.port || 3000));
    });
}

MemoRestTest.prototype.close = function (cb) {
    var self = this;
    self.server.close(cb);
}

MemoRestTest.prototype.keys = function () {
    var self = this;
    return self.request({path : "/keys", method : "GET", responseType:"json"});
}

MemoRestTest.prototype.count = function () {
    var self = this;
    return self.request({path : "/count", method : "GET", responseType:"json"});
}

MemoRestTest.prototype.get = function (memo, pick) {
    var self = this;
    memo = memo || "";
    pick = pick && pick.join("|") || "";
    return self.request({path : "/get/" + memo + "/" + pick, method : "GET", responseType:"json"});
}

MemoRestTest.prototype.create = function (memo) {
    var self = this;
    return self.request({path : "/create", data:{memo:memo}, method : "POST", responseType:"json"});
}




/////////////
// TESTCASES : MemoRestTest
///////

describe("memo.rest", function() {
    var mrt;

    before(function(done) {
        mrt = new MemoRestTest({ urlbase : "localhost", port:5005 });
        done();
    });

    after(function(done){
        mrt.close(done);
    });

    beforeEach(function(done) { 
        mrt.memodb.removeAll()
        .then(function() {
            return Promise.all([
                mrt.memodb.create({id:"test1",author:"rbl",content:"RRR"}),
                mrt.memodb.create({id:"test2",author:"llo",content:"LLL"}),
                mrt.memodb.create({id:"test3",author:"ll",content:"lll"})
            ]);
        })
        .then(function() {done();})
        .catch(done);
    });

    afterEach(function(done) { 
        mrt.memodb.removeAll()
        .then(function() {done();})
        .catch(done); 
    });

    describe("keys", function() {
        it("must return the empty memo keys after a removeall", function(done) {
            return mrt.memodb.removeAll()
            .then(function() { 
                return mrt.keys(); 
            })
            .then(
                function(response) {
                    expect(response).to.be.ok;
                    expect(response.info).to.be.ok;
                    expect(response.info.duration).to.be.lessThan(500);
                    expect(response.info.statusCode).to.be.equal(200);
                    expect(response.data).to.be.ok;
                    expect(response.data.status).to.be.equal("SUCCESS");
                    expect(response.data.keys).to.be.ok;
                    expect(response.data.keys.length).to.be.equal(0);
                    done();
                },
                function(error) {
                    done(error);
                }
            )
            .catch(function(err) { done(err); });
        });

        it("must return the registered memo keys", function(done) {
            return mrt.keys()
            .then(
                function(response) {
                    expect(response).to.be.ok;
                    expect(response.info).to.be.ok;
                    expect(response.info.duration).to.be.lessThan(500);
                    expect(response.info.statusCode).to.be.equal(200);
                    expect(response.data).to.be.ok;
                    expect(response.data.status).to.be.equal("SUCCESS");
                    expect(response.data.keys).to.be.ok;
                    expect(response.data.keys.length).to.be.equal(3);
                    done();
                },
                function(error) {
                    done(error);
                }
            )
            .catch(function(err) { done(err); });
        });
    });

    describe("count", function() {
        it("must return the 0 after a removeall", function(done) {
            return mrt.memodb.removeAll()
            .then(function() { 
                return mrt.count(); 
            })
            .then(
                function(response) {
                    expect(response).to.be.ok;
                    expect(response.info).to.be.ok;
                    expect(response.info.duration).to.be.lessThan(500);
                    expect(response.info.statusCode).to.be.equal(200);
                    expect(response.data).to.be.ok;
                    expect(response.data.status).to.be.equal("SUCCESS");
                    expect(response.data.count).to.be.equal(0);
                    done();
                },
                function(error) {
                    done(error);
                }
            )
            .catch(function(err) { done(err); });
        });

        it("must return the 3 registered memo", function(done) {
            return mrt.count()
            .then(
                function(response) {
                    expect(response).to.be.ok;
                    expect(response.info).to.be.ok;
                    expect(response.info.duration).to.be.lessThan(500);
                    expect(response.info.statusCode).to.be.equal(200);
                    expect(response.data).to.be.ok;
                    expect(response.data.status).to.be.equal("SUCCESS");
                    expect(response.data.count).to.be.equal(3);
                    done();
                },
                function(error) {
                    done(error);
                }
            )
            .catch(function(err) { done(err); });
        });
    });

    describe("get", function() {
       it("must return a valid registered memo with it's all properties", function(done) {
            return mrt.get("test1")
            .then(
                function(response) {
                    expect(response).to.be.ok;
                    expect(response.info).to.be.ok;
                    expect(response.info.duration).to.be.lessThan(500);
                    expect(response.info.statusCode).to.be.equal(200);
                    expect(response.data).to.be.ok;
                    expect(response.data.status).to.be.equal("SUCCESS");
                    expect(response.data.memo).to.be.ok;
                    expect(response.data.memo.id).to.be.equal("test1");
                    expect(response.data.memo.author).to.be.equal("rbl");
                    expect(response.data.memo.content).to.be.equal("RRR");
                    done();
                },
                function(error) {
                    done(error);
                }
            )
            .catch(function(err) { done(err); });
        });
        
        it("must return a valid registered memo with it's picked properties", function(done) {
            return mrt.get("test1", ["author", "id"])
            .then(function(response) {
                expect(response).to.be.ok;
                expect(response.info).to.be.ok;
                expect(response.info.duration).to.be.lessThan(500);
                expect(response.info.statusCode).to.be.equal(200);
                expect(response.data).to.be.ok;
                expect(response.data.status).to.be.equal("SUCCESS");
                expect(response.data.memo).to.be.ok;
                expect(response.data.memo.id).to.be.equal("test1");
                expect(response.data.memo.author).to.be.equal("rbl");
                expect(response.data.memo.content).to.be.not.ok;
                done();
            })
            .catch(function(err) { done(err); });
        });

        it("must return a valid registered memo with it's all properties even if the pick is an empty array", function(done) {
            return mrt.get("test1", [])
            .then(function(response) {
                expect(response).to.be.ok;
                expect(response.info).to.be.ok;
                expect(response.info.duration).to.be.lessThan(500);
                expect(response.info.statusCode).to.be.equal(200);
                expect(response.data).to.be.ok;
                expect(response.data.status).to.be.equal("SUCCESS");
                expect(response.data.memo).to.be.ok;
                expect(response.data.memo.id).to.be.equal("test1");
                expect(response.data.memo.author).to.be.equal("rbl");
                expect(response.data.memo.content).to.be.equal("RRR");
                done();
            })
            .catch(function(err) { done(err); });
        });
    });
});