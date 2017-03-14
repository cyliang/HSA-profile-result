function APITraceAnalyzer(updateFrequency, reportDiv) {
    this.url = null;
    this.interval = null;
    this.updateFrequency = updateFrequency;
    this.reportDiv = reportDiv;
    this.rawData = null;
    this.analyzeResult = null;

    this.updateURL = function(url) {
        this.url = url;
        this.interval = window.setInterval(this.update, this.updateFrequency * 1000, this);
        this.update(this);
    };

    this.update = function(_this) {
        _this.loadResult();
    };

    this.loadResult = function() {
        let _this = this;

        $.get(this.url, function(data, status) {
            if (status != 'success') {
                _this.loadFailed(status);
                return;
            }

            if (data != _this.rawData) {
                _this.rawData = data;
                _this.analyze();
            }
        }).fail(function(_, status) {
            _this.loadFailed(status);
        });
    };

    this.loadFailed = function(status) {
        alert("Failed to load specified URL: " + status);
        window.clearInterval(this.interval);
        this.interval = null;
    };

    this.analyze = function() {
        let apiOutputStart = this.rawData.indexOf("=====CodeXL hsa Timestamp Output=====");
        let apiTimeStart = this.rawData.indexOf("=====CodeXL hsa Timestamp Output=====");
        let kernelTimeStart = this.rawData.indexOf("=====CodeXL hsa Kernel Timestamp Output=====");

        this.analyzeResult = {
            apiOutput: new APIOutput(this.rawData.slice(apiOutputStart, apiTimeStart - 1), this),
            apiTime: new APITime(this.rawData.slice(apiTimeStart, kernelTimeStart - 1), this),
            kernelTime: new KernelTime(this.rawData.slice(kernelTimeStart), this)
        };

        this.report();
    };

    this.report = function() {
        this.reportDiv.empty();
        this.analyzeResult.apiTime.report(reportDiv);
    };

    function APIOutput(data, analyzer) {
        let lines = data.split("\n");
        let count = lines[2];

        this.analyzer = analyzer;
        this.calls = lines.slice(3);
    };

    function APITime(data, analyzer) {
        let lines = data.split("\n");
        let count = lines[2];

        this.analyzer = analyzer;
        this.apiDurations = {};
        this.div = null;

        lines = lines.slice(3);
        for (let call in lines) {
            let fields = lines[call].split(/ +/);
            let duration = fields[3] - fields[2];

            if (this.apiDurations[fields[1]] == undefined) {
                this.apiDurations[fields[1]] = [duration];
            } else {
                this.apiDurations[fields[1]].push(duration);
            }
        }

        let _this = this;
        this.statisticResult = $.map(this.apiDurations, function(value, key) {
            let durations = jStat(value);

            durations._apiName = key;
            durations.apiName = function() {
                return this._apiName;
            };

            durations.ratio = function() {
                return (this.sum() / _this.totalTime * 100).toFixed(4) + "%";
            };

            return durations;
        });
        this.totalTime = this.statisticResult.reduce(function(total, currentValue) {
            return total + currentValue.sum();
        }, 0);

        this.sort = function() {
            if (this.analyzer.sortApiTime !== undefined) {
                let sort = this.analyzer.sortApiTime;
                let column = sort.slice(1);
                let order = Number(sort[0] + '1');

                this.statisticResult.sort(function(l, r) {
                    return (r[column]() - l[column]()) * order;
                });
            }
        };
        this.sort();

        this.report = function(div) {
            if (this.div == null) {
                this.div = $('<div>').appendTo(div);
            } else {
                this.div.empty();
            }

            this.div.append(
                "<h3>API Times Analysis</h3>"
            );

            this.drawTable();
        };

        this.drawTable = function() {
            let table = $('<table class="table table-striped table-hover">').appendTo(this.div);
            let columns = {
                apiName: "API",
                cols: "Count",
                min: "Min",
                max: "Max",
                median: "Median",
                stdev: "Standard Deviation",
                sum: "Cumulative",
                ratio: "%"
            };

            let theadr = $('<tr>').appendTo($('<thead>').appendTo(table));
            let _this = this;
            $.each(columns, function(key, value) {
                let sort = _this.analyzer.sortApiTime;
                if (sort !== undefined && sort.slice(1) == key) {
                    value = sort[0] + value;
                    key = sort[0] + key;
                }

                $('<a>').appendTo($('<th>').appendTo(theadr))
                    .text(value)
                    .attr('href', '#')
                    .data('column', key)
                    .click(function() {
                        if (key[0] == '-') {
                            _this.analyzer.sortApiTime = '+' + $(this).data('column').slice(1);
                        } else if (key[0] == '+') {
                            _this.analyzer.sortApiTime = '-' + $(this).data('column').slice(1);
                        } else {
                            _this.analyzer.sortApiTime = '-' + $(this).data('column');
                        }

                        _this.sort();
                        _this.report();
                    });
            });

            let tbody = $('<tbody>').appendTo(table);
            $.each(this.statisticResult, function(index, result) {
                let tr = $('<tr>').appendTo(tbody);
                $.each(columns, function(key, value) {
                    let number = result[key]();
                    if (Number(number) === number) {
                        number = (Math.round(number * 10000) / 10000).toLocaleString();
                    }

                    $('<td>').appendTo(tr).text(number);
                });
            });
        };
    };

    function KernelTime(data, analyzer) {
        var lines = data.split("\n");
        var count = lines[1];

        this.analyzer = analyzer;
    }
}

