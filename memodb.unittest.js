global.ROOT_DIR = process.cwd() || __dirname;

var expect = require("chai").expect;
var MemoCache = require("memocache");

var MemoDB = require("./memodb");

describe("unit.memodb", function() {
    var mcache;
    var memodb;

    before(function(done) {
        mcache = new MemoCache({maxSize:5000});
        memodb = new MemoDB({mcache:mcache, memopath:ROOT_DIR + "/test/memo"});
        done();
    });

    after(function() { delete(mcache); });

    describe("initial", function() {
        it("must to have a TYPE as memo", function(done) {
            expect(memodb).to.be.ok;
            expect(memodb.TYPE).to.be.equal("memo");
            done();
        });

        it("must to have a mcache as memo", function(done) {
            expect(memodb).to.be.ok;
            expect(memodb.mcache).to.be.ok;
            done();
        });

        it("must to have a schema defined", function(done) {
            expect(memodb).to.be.ok;
            expect(memodb.SCHEMA).to.be.ok;
            done();
        });
    });

    describe("create", function() {
        beforeEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });
        afterEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        it("must block the creation because missing a required parameter", function(done) {
            memodb.create()
            .then(function(memo) {
                done(new Error("should not pass here, because the creation have to fail"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.MISSING_PARAMS);
                done();
            })
            .catch(done);
        });

        it("must block the creation because missing the memo id", function(done) {
            memodb.create({})
            .then(function(memo) {
                done(new Error("should not pass here, because the creation have to fail"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.MISSING_PARAMS);
                done();
            })
            .catch(done);
        });

        it("must create memo well", function(done) {
            memodb.create({id:"test"})
            .then(function(memo) {
                expect(memo).to.be.ok;
                done();
            })
            .catch(done);
        });

        it("must not create a duplicate", function(done) {
            memodb.create({id:"test"})
            .then(function(memo) {
                return memodb.create({id:"test"});
            })
            .then(function(memo) {
                expect(memo).to.be.not.ok;
                done();
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.DUPLICATE);
                done();
            })
            .catch(done);
        });

        it("must create a memo with its properties by default", function(done) {
            memodb.create({id:"test"})
            .then(function(memo) {
                expect(memo).to.be.ok;
                return memodb.load(memo.id);
            })
            .then(function(readedMemo) {
                expect(readedMemo).to.be.ok;
                expect(readedMemo.type).to.be.equal(memodb.TYPE);
                expect(readedMemo.content).to.be.equal("");
                expect(readedMemo.author).to.be.equal("");
                done();
            })
            .catch(function(err) { done(err); });
        });

        it("must create a memo with given properties", function(done) {
            memodb.create({id:"test", author:"rbl", content:"test test"})
            .then(function(memo) {
                expect(memo).to.be.ok;
                memodb.load(memo.id)
                .then(function(readedMemo) {
                    expect(readedMemo).to.be.ok;
                    expect(readedMemo.type).to.be.equal(memodb.TYPE);
                    expect(readedMemo.author).to.be.equal("rbl");
                    expect(readedMemo.content).to.be.equal("test test");
                    done();
                })
                .catch(function(err) { done(err); });
            })
            .catch(function(err) { done(err); });
        });
    });

    describe("rename", function() {
        beforeEach(function(done) { 
            memodb.removeAll()
            .then(function() {
                return Promise.all([
                    memodb.create({id:"test1",author:"rbl",content:"RRR"}),
                    memodb.create({id:"test2",author:"llo",content:"LLL"}),
                    memodb.create({id:"test3",author:"ll",content:"lll"})
                ]);
            })
            .then(function() {done();})
            .catch(done);
        });

        afterEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        it("must not rename a non existent memo", function(done) {
            memodb.rename("test5", "clone-test1")
            .then(function(memo) {
                done(new Error("should not pass here, because the update have to fail"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.NOTFOUND);
                done();
            })
            .catch(done);
        });

        it("must rename an existent memo", function(done) {
            memodb.rename("test3", "test3-renamed")
            .then(function(memo) {
                expect(memo).to.be.ok;
                expect(memo.id).to.be.equal("test3-renamed");
                expect(memo.author).to.be.equal("ll");
                return memodb.keys();
            })
            .then(function(keys) {
                expect(keys).to.be.ok;
                expect(keys.length).to.be.equal(3);
                expect(keys).to.include("test3-renamed");
                expect(keys).to.not.include("test3");
                done();
            })
            .catch(done);
        });
    });

    describe("clone", function() {
        beforeEach(function(done) { 
            memodb.removeAll()
            .then(function() {
                return Promise.all([
                    memodb.create({id:"test1",author:"rbl",content:"RRR"}),
                    memodb.create({id:"test2",author:"llo",content:"LLL"}),
                    memodb.create({id:"test3",author:"ll",content:"lll"})
                ]);
            })
            .then(function() {done();})
            .catch(done);
        });

        afterEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        it("must not clone a non existent memo", function(done) {
            memodb.clone("test5", "clone-test1", {content:"clonedclonedcloned"})
            .then(function(memo) {
                done(new Error("should not pass here, because the update have to fail"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.NOTFOUND);
                done();
            })
            .catch(done);
        });

        it("must clone an existent memo", function(done) {
            memodb.clone("test1", "clone-test1", {content:"clonedclonedcloned"})
            .then(function(cloned) {
                expect(cloned).to.be.ok;
                expect(cloned.id).to.be.equal("clone-test1");
                expect(cloned.content).to.be.equal("clonedclonedcloned");
                done();
            })
            .catch(done);
        });

        it("must clone even if it a clone", function(done) {
            memodb.clone("test1", "clone-test1", {content:"clonedclonedcloned"})
            .then(function(cloned) {
                return memodb.clone("clone-test1", "clone-clone-test1", {content:"clone of a clone"});
            })
            .then(function(cloneofclone) {
                expect(cloneofclone).to.be.ok;
                expect(cloneofclone.id).to.be.equal("clone-clone-test1");
                expect(cloneofclone.content).to.be.equal("clone of a clone");
                done();
            })
            .catch(done);
        });

        it("must not clone a removed memo", function(done) {
            memodb.remove("test1")
            .then(function(removedMemo) {
                expect(removedMemo).to.be.ok;
                expect(removedMemo.id).to.be.equal("test1");
            })
            .then(function() {
                return memodb.clone("test1", "clone-test1", {content:"clonedclonedcloned"});
            })
            .then(function(cloned) {
                expect(cloned).to.be.ok;
                expect(cloned.id).to.be.equal("clone-clone-test1");
                expect(cloned.content).to.be.equal("clone of a clone");
                done();
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.NOTFOUND);
                done();
            });
        });
    });

    describe("update", function() {
        beforeEach(function(done) { 
            memodb.removeAll()
            .then(function() {
                return Promise.all([
                    memodb.create({id:"test1",author:"rbl",content:"RRR"}),
                    memodb.create({id:"test2",author:"llo",content:"LLL"}),
                    memodb.create({id:"test3",author:"ll",content:"lll"})
                ]);
            })
            .then(function() { done(); })
            .catch(done);
        });
        afterEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });
        
        it("must to update the existent memo test1", function(done) {
            memodb.update({id:"test1", author:"RBL"})
            .then(function(memo) {
                expect(memo).to.be.ok;
                expect(memo.author).to.be.equal("RBL");
                done();
            })
            .catch(done);
        });

        it("must not update a non existent memo test4", function(done) {
            memodb.update({id:"test4", author:"al"})
            .then(function(memo) {
                done(new Error("should not pass here, because the update have to fail"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.NOTFOUND);
                done();
            })
            .catch(done);
        });
    });

    describe("remove", function() {
        beforeEach(function(done) { 
            memodb.removeAll()
            .then(function() {
                return Promise.all([
                    memodb.create({id:"test1",author:"rbl",content:"RRR"}),
                    memodb.create({id:"test2",author:"llo",content:"LLL"}),
                    memodb.create({id:"test3",author:"ll",content:"lll"})
                ]);
            })
            .then(function() {done();})
            .catch(done);
        });

        afterEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        it("must to remove an existent memo", function(done) {
            memodb.remove("test1")
            .then(function(memo) {
                expect(memo).to.be.ok;
                expect(memo.id).to.be.equal("test1");
                return memodb.load(memo.id);
            })
            .then(function(loadedMemo){
                expect(loadedMemo).to.be.not.ok;
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.NOTFOUND);
                done();
            })
            .catch(done);
        });

        it("must return an error when try to remove a non existent memo", function (done) {
            memodb.remove("test4")
            .then(function(memo) {
                done(new Error("should not pass here, because the creation have to fail"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.NOTFOUND);
                done();
            })
            .catch(done);
        });
    });

    describe("removeList", function() {
        beforeEach(function(done) { 
            memodb.removeAll()
            .then(function() {
                return Promise.all([
                    memodb.create({id:"test1",author:"rbl",content:"RRR"}),
                    memodb.create({id:"test2",author:"llo",content:"LLL"}),
                    memodb.create({id:"test3",author:"ll",content:"lll"})
                ]);
            })
            .then(function() {done();})
            .catch(done);
        });

        afterEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        it("must to remove test1 and test3", function(done) {
            memodb.removeList(["test1", "test3"])
            .then(function (removedList) {
                expect(removedList).to.be.ok;
                expect(removedList.length).to.be.equal(2);
                expect(removedList[0].author).to.be.equal("rbl");
                expect(removedList[1].author).to.be.equal("ll");
            })
            .then(function(){
                return memodb.keys()
            })
            .then(function(keys) {
                expect(keys).to.be.ok;
                expect(keys.length).to.be.equal(1);
                expect(keys[0]).to.be.equal("test2");
                done();
            })
            .catch(done);
        });

        it("must to remove 2 of 3 required memos", function(done) {
            memodb.removeList(["test1", "test4", "test3"])
            .then(function (removedList) {
                expect(removedList).to.be.ok;
                expect(removedList.length).to.be.equal(2);
                expect(removedList[0].author).to.be.equal("rbl");
                expect(removedList[1].author).to.be.equal("ll");
            })
            .then(function(){
                return memodb.keys()
            })
            .then(function(keys) {
                expect(keys).to.be.ok;
                expect(keys.length).to.be.equal(1);
                expect(keys[0]).to.be.equal("test2");
                done();
            })
            .catch(done);
        });
    });

    describe("getList", function() {
        beforeEach(function(done) { 
            memodb.removeAll()
            .then(function() {
                return Promise.all([
                    memodb.create({id:"test1",author:"rbl",content:"RRR"}),
                    memodb.create({id:"test2",author:"llo",content:"LLL"}),
                    memodb.create({id:"test3",author:"ll",content:"lll"})
                ]);
            })
            .then(function() {done();})
            .catch(done);
        });

        afterEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        it("must retrieve 2 of 3 required ids", function(done) {
            memodb.getList(["test1", "test3", "test4"])
            .then(function(list){
                expect(list).to.be.ok;
                expect(list.length).to.be.equal(2);
                done();
            })
            .catch(done);
        });
    });

    describe("get", function() {
        beforeEach(function(done) { 
            memodb.removeAll()
            .then(function() {
                return memodb.create({id:"test1",author:"rbl",content:"RRR"});
            })
            .then(function() {done();})
            .catch(done);
        });

        afterEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        it("must get an existent memo", function(done) {
            memodb.get("test1")
            .then(function(memo) {
                expect(memo).to.be.ok;
                expect(memo.id).to.be.equal("test1");
                expect(memo.content).to.be.equal("RRR");
                done();
            })
            .catch(done);
        });

        it("must get an error when get a non existent memo", function(done) {
            memodb.get("test2")
            .then(function(memo) {
                done(new Error("should not pass here, because the get operation have to fail"));
            })
            .catch(function(err) {
                expect(err).to.be.ok;
                expect(err.error).to.be.equal(MemoDB.ERROR.NOTFOUND);
                done();
            })
            .catch(done);
        });

        it("must get an existent memo and pick some properties", function(done) {
            memodb.get("test1", ["content"])
            .then(function(memo) {
                expect(memo).to.be.ok;
                expect(memo.id).to.be.not.ok;
                expect(memo.author).to.be.not.ok;
                expect(memo.content).to.be.equal("RRR");
                done();
            })
            .catch(done);
        });

        it("must get an existent memo and pick some properties", function(done) {
            memodb.get("test1", ["content", "author"])
            .then(function(memo) {
                expect(memo).to.be.ok;
                expect(memo.id).to.be.not.ok;
                expect(memo.author).to.be.equal("rbl");
                expect(memo.content).to.be.equal("RRR");
                done();
            })
            .catch(done);
        });
    });

    describe("random", function() {
        beforeEach(function(done) { 
            memodb.removeAll()
            .then(function() {
                return Promise.all([
                    memodb.create({id:"test1",author:"rbl",content:"RRR"}),
                    memodb.create({id:"test2",author:"llo",content:"LLL"}),
                    memodb.create({id:"test3",author:"ll",content:"lll"}),
                    memodb.create({id:"test4",author:"al",content:"al"})
                ]);
            })
            .then(function() {done();})
            .catch(done);
        });

        afterEach(function(done) { 
            memodb.removeAll()
            .then(function() {done();})
            .catch(done); 
        });

        it("must get one random element if the random function was call without parameters", function(done) {
            memodb.random()
            .then(function(list){
                expect(list).to.be.ok;
                expect(list.length).to.be.equal(1);
                done();
            })
            .catch(done);
        });

        it("must get one random element", function(done) {
            memodb.random(1)
            .then(function(list){
                expect(list).to.be.ok;
                expect(list.length).to.be.equal(1);
                done();
            })
            .catch(done);
        });

        it("must get two random element", function(done) {
            memodb.random(2)
            .then(function(list){
                expect(list).to.be.ok;
                expect(list.length).to.be.equal(2);
                done();
            })
            .catch(done);
        });

        it("must get all elements by calling random with max", function(done) {
            memodb.random(4)
            .then(function(list){
                expect(list).to.be.ok;
                expect(list.length).to.be.equal(4);
                done();
            })
            .catch(done);
        });

        it("must get all elements by calling random with more than max", function(done) {
            memodb.random(10)
            .then(function(list){
                expect(list).to.be.ok;
                expect(list.length).to.be.equal(4);
                done();
            })
            .catch(done);
        });
    });
});