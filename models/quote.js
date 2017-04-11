module.exports.SCHEMA = {
    id : String,
    content : String,
    author : String,
    status : String,
    since : Date,
    lastupdate : Date
}

module.exports.SCHEMADEFAULT = function() {
    return {
        since : Date.now(),
        lastupdate : Date.now(),
        status : "PUBLIC",
        content : "",
        author : ""
    };
}