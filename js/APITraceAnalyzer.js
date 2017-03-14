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
        var _this = this;

        $.get(this.url, function(data, status) {
            if (status != 'success') {
                _this.loadFailed(status);
                return;
            }

            _this.rawData = data;
            _this.analyze();
        });
    };

    this.loadFailed = function(status) {
        alert("Failed to load specified URL: " + status);
        window.clearInterval(this.interval);
        this.interval = null;
    };

    this.analyze = function() {
        var apiOutputStart = this.rawData.indexOf("=====CodeXL hsa Timestamp Output=====");
        var apiTimeStart = this.rawData.indexOf("=====CodeXL hsa Timestamp Output=====");
        var kernelTimeStart = this.rawData.indexOf("=====CodeXL hsa Kernel Timestamp Output=====");

        this.analyzeResult = {
            apiOutput: new APIOutput(this.rawData.slice(apiOutputStart, apiTimeStart - 1)),
            apiTime: new APITime(this.rawData.slice(apiTimeStart, kernelTimeStart - 1)),
            kernelTime: new KernelTime(this.rawData.slice(kernelTimeStart))
        };
    };

    function APIOutput(data) {
        var lines = data.split("\n");
        var count = lines[2];

        this.calls = lines.slice(3);
    };

    function APITime(data) {
        var lines = data.split("\n");
        var count = lines[2];

        this.apiDurations = {};

        lines = lines.slice(3);
        for (var call in lines) {
            var fields = lines[call].split(/ +/);
            var duration = fields[3] - fields[2];

            if (this.apiDurations[fields[1]] == undefined) {
                this.apiDurations[fields[1]] = [duration];
            } else {
                this.apiDurations[fields[1]].push(duration);
            }
        }

        console.log(this.apiDurations);
    };

    function KernelTime(data) {
        var lines = data.split("\n");
        var count = lines[1];
    }
}

