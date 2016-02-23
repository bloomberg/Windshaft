'use strict';

var dot = require('dot');
dot.templateSettings.strip = false;

function createTemplate(method) {
    return dot.template([
        'SELECT',
        method,
        'FROM ({{=it._sql}}) _table_sql WHERE {{=it._column}} IS NOT NULL'
    ].join('\n'));
}

var methods = {
    quantiles: 'CDB_QuantileBins(array_agg(distinct({{=it._column}}::numeric)), 5) as quantiles',
    equal: 'CDB_EqualIntervalBins(array_agg({{=it._column}}::numeric), 5) as equal',
    jenks: 'CDB_JenksBins(array_agg(distinct({{=it._column}}::numeric)), 5) as jenks',
    headtails: 'CDB_HeadsTailsBins(array_agg(distinct({{=it._column}}::numeric)), 5) as headtails'
};

var methodTemplates = Object.keys(methods).reduce(function(methodTemplates, methodName) {
    methodTemplates[methodName] = createTemplate(methods[methodName]);
    return methodTemplates;
}, {});

function PostgresDatasource (psql, query) {
    this.psql = psql;
    this.query = query;
}

PostgresDatasource.prototype.getName = function () {
    return 'PostgresDatasource';
};

PostgresDatasource.prototype.getRamp = function (column, method, callback) {
    var methodName = methods.hasOwnProperty(method) ? method : 'quantiles';
    var template = methodTemplates[methodName];

    var q = template({ _column: column, _sql: this.query});

    this.psql.query(q, function (err, result) {
        if (err) {
            return callback(err);
        }

        callback(null, result.rows[0][method]);
    });
};

module.exports = PostgresDatasource;