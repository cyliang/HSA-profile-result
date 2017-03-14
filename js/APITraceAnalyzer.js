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

            _this.rawData = data;
            _this.analyze();
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
            apiOutput: new APIOutput(this.rawData.slice(apiOutputStart, apiTimeStart - 1)),
            apiTime: new APITime(this.rawData.slice(apiTimeStart, kernelTimeStart - 1)),
            kernelTime: new KernelTime(this.rawData.slice(kernelTimeStart))
        };

        this.report();
    };

    this.report = function() {
        this.reportDiv.empty();
        this.analyzeResult.apiTime.report(reportDiv);
    };

    function APIOutput(data) {
        let lines = data.split("\n");
        let count = lines[2];

        this.calls = lines.slice(3);
    };

    function APITime(data) {
        let lines = data.split("\n");
        let count = lines[2];

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

        this.report = function(div) {
            this.div = $('<div>').appendTo(div);
            this.div.append(
                "<h3>API Times Analysis</h3>"
            );

            this.drawTable();
        };

        this.drawTable = function() {
            let table = $('<table class="table table-striped table-hover">').appendTo(this.div);
            let columns = {
                apiName: "API",
                min: "Min",
                max: "Max",
                median: "Median",
                stdev: "Standard Deviation",
                sum: "Cumulative",
                ratio: "%"
            };

            let theadr = $('<tr>').appendTo($('<thead>').appendTo(table));
            $.each(columns, function(value, key) {
                $('<th>').appendTo(theadr).text(value);
            });

            let tbody = $('<tbody>').appendTo(table);
            $.each(this.statisticResult, function(index, result) {
                let tr = $('<tr>').appendTo(tbody);
                $.each(columns, function(key, value) {
                    let number = result[key]();
                    if (Number(number) === number) {
                        number = Math.round(number * 10000) / 10000;
                    }

                    $('<td>').appendTo(tr).text(number);
                });
            });
        };
    };

    function KernelTime(data) {
        var lines = data.split("\n");
        var count = lines[1];
    }
}

