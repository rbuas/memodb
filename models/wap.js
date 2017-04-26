module.exports.SCHEMA = {
    id : String,
    since : Date,
    lastupdate : Date,
    status : String,
    author : String,

    alias : Array,
    priority : Number,
    type : String,

    title : String,
    resume : String,
    content : String,
    contentlist : Array,
    category : Array,
    crosslink : Array,
    breadcrumb : Array,

    canonical : String,
    metatitle : String,
    metalocale : String,
    metadescription : String,
    metaentity : String,
    metaimage : String,
    metafollow : Boolean,
    metaindex : Boolean
}

module.exports.SCHEMADEFAULT = function() {
    return {
        since : Date.now(),
        lastupdate : Date.now(),
        status : "PUBLIC",
        author : "",

        alias : [],
        priority : 1,
        type : "wap",

        title : "",
        resume : "",
        content : "",
        contentlist : [],
        category : [],
        crosslink : [],

        canonical : "",
        metatitle : "",
        metadescription : "",
        metaimage : "",
        metafollow : true,
        metaindex : true
    };
}