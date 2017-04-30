angular.module('App').controller('caixaDashCtrl2A', function($scope,$resource){
   
   queue()
      .defer(d3.json, "/api/data/1/UCSReserv1/bl2")
      .await(renderData1);
	  
	  
function renderData1(error,apiData) {
	var sensorData = apiData;
	makeGraphs1(sensorData);
}


d3.select('#date_select').on('change', function() {
	  var now = new Date();
	  var lastQuarter = d3.time.month.offset(now, -3);
       var nd = new Date();
	   switch (this.value) {
          case "week":
		      {
				nd = d3.time.monday(now);  
			   }
          break;
          case "month":
              {
				nd = d3.time.month(now);  
			   }
          break;
		            case "all":
              {
				nd = lastQuarter;  
			   }
          break;
         default:
               nd = lastQuarter;  

	}
	
	
	var minDate = nd;
	var maxDate = now;
//	console.log("minDate:" + minDate);
//	console.log("maxDate: " + maxDate);	

    queue()
	  .defer(d3.json, "/api/data/1/UCSReserv1/bl2")
	  .await(rD);
	  
    function rD(error,apiData) {
	    var sensorData = apiData;
	    makeGraphs1(sensorData,minDate,maxDate);
    }

    });	

function makeGraphs1(apiData,minDate,maxDate){
	
   //Start Transformations
	var dataSet = apiData;
    //  "datetime": "2/17/2017  9:00:00"
	var dateFormat = d3.time.format("%m/%d/%Y %H:%M:%S");
	var monthFormat = d3.time.format("%m");
	
	dataSet.forEach(function(d) {
		d.datetime = dateFormat.parse(d.datetime);
		d.month = monthFormat(d.datetime);
		if (d.level4 == 1) {
			d.total = 120;
			} 
		else if (d.level3 == 1) {
			d.total = 110;
			}
		else if (d.level2 == 1) {
			d.total = 100;
			}
		else if (d.level1 == 1) {
			d.total = 50;
			}	
		 else {
			d.total = 5;
		}	
	});

	//Cria Crossfilter
	var ndx = crossfilter(dataSet);
	
    // Cria as dimensões
    var reservatorio = ndx.dimension(function(d) { return d.sensorid; });	
	reservatorio.filter(2);
	
	var timeDim = ndx.dimension(function(d) {return new Date(d.datetime).getTime() });
    //Define o toggle de reservatorios
	var reservatorioGroup = reservatorio.group();
	
	//Define o chart #1 de níveis sobrepostos 
	var wLevel =  timeDim.group().reduceSum(function(d) { return d.total;} );
	var status_tc = timeDim.group().reduceSum(function(d) { if (d.level1 == 1) {return 20;} else{return 10;};});
	var status_tl = timeDim.group().reduceSum(function(d) { if (d.level2 == 1) {return 30;} else {return 0;};});
	var status_tm = timeDim.group().reduceSum(function(d) { if (d.level3 == 1) {return 40;} else {return 0;};});
	var status_tf = timeDim.group().reduceSum(function(d) { if (d.level4 == 1) {return 10;} else {return 0;};});	
	
	
	//Define o bar chart de dias críticos
    var countCriticalDays = timeDim.group().reduce(
	function reduceAdd(p, v) {return (v.total == 10) ? p + 1 : p;},
	function reduceRemove(p, v) {return (v.total > 10) ? p - 1 : p;},
	function reduceInitial() {return 0;}
	);
	
//Define threshold values for data	
	var firstD = timeDim.bottom(1)[0].datetime;
	var lastD = timeDim.top(1)[0].datetime;
	var minD, maxD = new Date();
	if (minDate == undefined)  {minD = firstD;} else {minD = minDate;};
	if (maxDate == undefined) {maxD = lastD;} else {maxD = maxDate;};

	console.log("firstD:" + firstD);
	console.log("lastD: " + lastD);	
	console.log("minD:" + minD);
	console.log("maxD: " + maxD);	
	
	var dateChart = dc.lineChart("#date-chart");
	dateChart
		//		.width(600)
		.height(260)
		.margins({top: 80, right: 30, bottom: 50, left: 50})
		.legend(dc.legend().x(60).y(10).itemHeight(13).gap(5))
        .on('renderlet',function (chart) {chart.selectAll("g.x text").attr('dx', '-30').attr('dy', '-7').attr('transform', "rotate(-90)");} ) 
		.dimension(timeDim)
		.group(wLevel, "Nível da Água")
//		.group(status_tc,"critical")
//		.stack(status_tl,"low")
//		.stack(status_tm,"medium")
//		.stack(status_tf,"full")
		.renderArea(true)
		.x(d3.time.scale().domain([minD, maxD]))
		.y(d3.scale.linear().domain([0, 100]))
		.elasticY(false)
		.elasticX(false)
		.renderHorizontalGridLines(true)
    	.renderVerticalGridLines(true)
		.brushOn(true)
		.xAxisLabel("Data")
		.yAxisLabel("% Volume da Cisterna") 
		.ordinalColors(['blue'])
		.yAxis().ticks(10);

	var criticalDaysChart = dc.barChart("#critical-days-chart");		
    criticalDaysChart
//      .width(300)
      .height(220)
	  .margins({top: 30, right: 30, bottom: 50, left: 50})
	  .legend(dc.legend().x(60).y(10).itemHeight(13).gap(5))
      .on('renderlet',function (chart) {chart.selectAll("g.x text").attr('dx', '-30').attr('dy', '-7').attr('transform', "rotate(-90)");} ) 	  
      .dimension(timeDim)
      .group(countCriticalDays,"Reserva Crítica")
   	  .x(d3.time.scale().domain([minD, maxD]))
	  .transitionDuration(500)
      .centerBar(false)
      .barPadding(2)
	  .elasticY(false)
	  .renderVerticalGridLines(false)
	  .renderHorizontalGridLines(false)
	  .elasticX(false)	  
	  .brushOn(false)
      .xAxisLabel('Data')
      .ordinalColors(['#f40000','#ffff30','#009100','#009191','#ff7f00','#ffff33','#a65628'])
      .yAxisLabel('Ocorrência')
	  .yAxis().ticks(0);
		
    dc.renderAll();
	
   };

});