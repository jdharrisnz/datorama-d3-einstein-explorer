var emiExplorer = {
  'getBotList': function() {
    // Wrapper function for getting the bot list
      return new Promise((resolve, reject) => {
        DA.api.EMI.getBotsSummary({ cb: (err, botList) => {
          resolve(botList);
        }});
      });
  },
  'getBotResults': function(id) {
    // Wrapper function for getting the bot results
      return new Promise((resolve, reject) => {
        DA.api.EMI.getInsightsByBotId({ botId: id, cb: (err, botResults) => {
          resolve(botResults);
        }});
      });
  },
  'createBots': function(botList) {
  	loaded = true;
    var self = this;
    // Function for creating the bot list
      // Create bot divs
        bots = mainView.selectAll('div')
        .data(botList.bots
          .filter(x => {
            if (prefs.restrictToBots.length === 0) {
              return x.status == 'DONE' && x.hasInsights === true;
            }
            else {
              return prefs.restrictToBots.includes(x.id) && x.status == 'DONE' && x.hasInsights === true;
            }
          })
          .sort((a, b) => d3.descending(a.updatedFor, b.updatedFor)),
          d => d.id)
        .join('div')
          .attr('id', d => 'bot-' + d.id)
          .attr('class', 'bot')
          .style('opacity', 0);
        
        // Create names and separation lines
          var botName = bots.append('div')
            .attr('class', 'botName');
        
          botName.append('span')
            .on('mouseenter', d => { tooltip.style('display', null).text(d.name); })
            .on('mousemove', () => { tooltip.style('top', event.clientY + 'px').style('left', event.clientX + 'px'); })
            .on('mouseleave', () => { tooltip.style('display', 'none'); })
            .text(d => d.name);
          
          botName.append('hr');
        
        // Create metric name labels and trend arrows
          var botMetric = bots.append('div')
            .attr('class', 'metricName');
          
          botMetric.append('span')
            .attr('class', 'botLabel')
            .text('KPI: ');
          
          botMetric.append('span')
            .attr('class', 'botDesc')
            .on('mouseenter', (d, i, nodes) => { tooltip.style('display', null).text(d3.select(nodes[i]).text()); })
            .on('mousemove', () => { tooltip.style('top', event.clientY + 'px').style('left', event.clientX + 'px'); })
            .on('mouseleave', () => { tooltip.style('display', 'none'); })
            .each((d, i, nodes) => autoFormatNames(d.metricName).then(result => d3.select(nodes[i]).text(result)));
          
          botMetric.append('svg')
            .attr('class', 'trendArrow')
            .attr('viewBox', '0 0 18 18')
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('path')
              .attr('transform', d => {
                switch(d.expectedIncreasingTrend) {
                  case true:
                    return 'rotate(0)';
                  case false:
                    return 'rotate(90)';
                }
              })
              .attr('transform-origin', 'center center')
              .attr('d', 'M17.093 14.186c-.286.316-.746.403-1.128.215s-.592-.608-.514-1.026l.451-8.226-12.904 12.03c-.379.353-.973.333-1.326-.046s-.333-.973.046-1.326l12.923-12.05-8.278-.126c-.528-.011-.947-.448-.936-.975s.448-.947.975-.936l10.632.237c.258.004.504.113.68.303s.268.442.254.7l-.506 10.623c-.041.243-.174.46-.371.607z');
        
        // Create type labels
          var botType = bots.append('div')
            .attr('class', 'botType');
          
          botType.append('span')
            .attr('class', 'botLabel')
            .text('Types: ');
          
          botType.append('span')
            .attr('class', 'botDesc')
            .on('mouseenter', d => { tooltip.style('display', null).text([formatNames('KPI')].concat(d.analysisConfigs.filter(x => x.analysisType != 'KPI').map(x => formatNames(x.analysisSubType))).join(', ')); })
            .on('mousemove', () => { tooltip.style('top', event.clientY + 'px').style('left', event.clientX + 'px'); })
            .on('mouseleave', () => { tooltip.style('display', 'none'); })
            .text(d => { return [formatNames('KPI')].concat(d.analysisConfigs.filter(x => x.analysisType != 'KPI').map(x => formatNames(x.analysisSubType))).join(', '); });
        
        // Create date labels
          var botDates = bots.append('div')
            .attr('class', 'botDates');
          
          botDates.append('span')
            .attr('class', 'botLabel')
            .text('Dates: ');
          
          botDates.append('span')
            .attr('class', 'botText')
            .text(d => {
              var startDate = new Date(d.analysisConfigs.filter(x => x.analysisType == 'KPI')[0].date.startDate);
              var endDate = new Date(d.analysisConfigs.filter(x => x.analysisType == 'KPI')[0].date.endDate);
              return self.dateFormat(startDate) + self.enDash() + self.dateFormat(endDate);
            });
        
        // Create the notification containers and loaders
          bots.append('div')
            .attr('class', 'notifContainer')
            .append('div')
              .attr('class', 'loader');  
      
      // Bot creation done - make them visible!
        bots.transition()
        .style('opacity', 1);
      
      // Load insights on bots
        bots.each(d => {
          self.getBotResults(d.id).then(botResult => {
            botResult = self.filterBotResult(botResult);
            
            d3.select('#bot-' + d.id)
            .style('cursor', 'pointer')
            .on('click', () => {
              bots.transition()
              .style('opacity', 0)
              .end().then(() => {
                bots.style('display', 'none');
                self.createInsights(botResult);
              });
            })
            .select('.loader')
            .remove();
            
            d3.select('#bot-' + d.id + ' .notifContainer')
            .append('div')
              .attr('class', 'insightNotif')
              .text(botResult.insights.length + ' Insights')
              .style('opacity', 0)
              .transition()
              .style('opacity', 1);
          });
        });
  },
  'createInsights': function(botResult) {
    var self = this;
    var metricName = botResult.insightsBotResultConfig.metricName;
    var denomMetricName = botResult.insightsBotResultConfig.denominationMetricName;
    var volumeMetricName = botResult.insightsBotResultConfig.magnitudeMetricName;
    var numMetricName = botResult.insightsBotResultConfig.numeratorMetricName;
    // Function for populating the insights list
      // Create the header
        var insightsHeader = mainView.append('div')
          .datum(botResult.insightsBotResultConfig)
          .attr('id', 'insightsHeader')
          .style('opacity', 0);
        
        // Create the exit button
          if (prefs.loadDefaultBot.lockedToBot === false) {
            insightsHeader.append('svg')
              .attr('id', 'headerExit')
              .attr('viewBox', '0 1 24 22')
              .attr('preserveAspectRatio', 'xMidYMin meet')
              .on('click', () => {
                insightsHeader.transition()
                .style('opacity', 0)
                .end().then(() => {
                  insightsHeader.remove();
                });
                
                insights.transition()
                .style('opacity', 0)
                .end().then(() => {
                  insights.remove();
                  
                  document.body.scrollTop = 0;
                  
                  if (loaded === true) {
                    bots.style('display', null);
                    bots.transition()
                    .style('opacity', 1);
                  }
                  else {
                    self.getBotList().then(botList => {
                      self.createBots(botList);
                    });
                  }
                });
              })
              .selectAll('path')
              .data([
                'M10.027 6.333c.297-.025.575.15.68.429s.013.594-.227.771l-4.853 4.667 4.853 4.667c.265.258.271.682.013.947s-.682.271-.947.013l-5.333-5.2c-.13-.126-.204-.299-.204-.48s.074-.354.204-.48l5.333-5.2c.137-.105.309-.153.48-.133z',
                'M18.676 12.848h-13.685c-.363 0-.657-.294-.657-.657s.294-.657.657-.657h13.685c.363 0 .657.294.657.657s-.294.657-.657.657z'
                ])
              .join('path')
                .attr('d', d => d);
          }
        
        // Create the containers for the rest of the header
          var headerRows = insightsHeader.append('div')
            .attr('id', 'headerRowsContainer');
          
          var headerRow1 = headerRows.append('div')
            .attr('id', 'headerRow1');
          
          var headerRow2 = headerRows.append('div')
            .attr('id', 'headerRow2');
          
        // Create the header name
          var headerName = headerRow1.append('div')
            .attr('id', 'headerName');
          
          headerName.append('span')
            .text(d => d.name);
          
          headerName.append('svg')
            .attr('class', 'trendArrow')
            .attr('viewBox', '0 0 18 18')
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .append('path')
              .attr('transform', d => {
                switch(d.expectIncreasingTrend) {
                  case true:
                    return 'rotate(0)';
                  case false:
                    return 'rotate(90)';
                }
              })
              .attr('transform-origin', 'center center')
              .attr('d', 'M17.093 14.186c-.286.316-.746.403-1.128.215s-.592-.608-.514-1.026l.451-8.226-12.904 12.03c-.379.353-.973.333-1.326-.046s-.333-.973.046-1.326l12.923-12.05-8.278-.126c-.528-.011-.947-.448-.936-.975s.448-.947.975-.936l10.632.237c.258.004.504.113.68.303s.268.442.254.7l-.506 10.623c-.041.243-.174.46-.371.607z');
          
        // Create the header type filter
        var headerTypeFilter = headerRow1.append('div')
          .attr('class', 'headerFilter');
        
        headerTypeFilter.append('label')
          .attr('for', 'selectType')
          .text('Insight Type: ');
        
        headerTypeFilter.append('select')
          .attr('id', 'selectType')
          .on('change', () => { self.filterInsightsList(); })
          .selectAll('option')
          .data(d => { return ['All', 'KPI'].concat(Array.from(new Set(botResult.insights.filter(x => x.analysisType != 'KPI').map(x => x.analysisSubType)))); })
          .join('option')
            .attr('value', d => d)
            .text(d => formatNames(d));
        
        // Create the header dimension filter
          var headerDimFilter = headerRow1.append('div')
            .attr('class', 'headerFilter');
          
          headerDimFilter.append('label')
            .attr('for', 'selectDimensions')
            .text('Dimensions: ');
          
          headerDimFilter.append('select')
            .attr('id', 'selectDimensions')
            .on('change', () => { self.filterInsightsList(); })
            .selectAll('option')
            .data(() => { return ['All'].concat(Array.from(new Set(botResult.insights.map(x => Object.keys(x.dimensions)).flat()))); })
            .join('option')
              .attr('value', d => d)
              .each((d, i, nodes) => autoFormatNames(d).then(result => d3.select(nodes[i]).text(result)));
        
        // Create the header positive/negative filter
          var headerPosFilter = headerRow1.append('div')
          .attr('class', 'headerFilter');
          
          headerPosFilter.append('label')
            .attr('for', 'selectPos')
            .text('Positive/Negative: ');
          
          headerPosFilter.append('select')
            .attr('id', 'selectPos')
            .on('change', () => { self.filterInsightsList(); })
            .selectAll('option')
            .data(['All', 'Positive', 'Negative'])
            .join('option')
              .attr('value', d => d)
              .text(d => d);
          
        // Create the header factor filter
          var headerFactorFilter = headerRow1.append('div')
            .attr('class', 'headerFilter');
          
          headerFactorFilter.append('label')
            .attr('for', 'selectFactor')
            .text('Factor: ');
          
          headerFactorFilter.append('select')
            .attr('id', 'selectFactor')
            .on('change', () => { self.filterInsightsList(); })
            .selectAll('option')
            .data(['All', 'Single', 'Combo'])
            .join('option')
              .attr('value', d => d)
              .text(d => d);
          
        // Create the header note
          headerRow1.append('div')
            .attr('id', 'headerNote')
            .text('Insights numbered by significance.');
        
        // Create the header insight types overview
          var typeOverview = headerRow2.selectAll('div')
          .data(d => {
            var types = ['KPI'].concat(Array.from(new Set(botResult.insights.filter(x => x.analysisType != 'KPI').map(x => x.analysisSubType))));
            var result = [];
            types.forEach((type, i) => {
              if (i === 0) {
                var config = d.analysisConfigs.filter(x => x.analysisType == 'KPI')[0];
                result.push({
                  'name': type,
                  'total': botResult.insights.filter(x => x.analysisType == 'KPI')[0].data.totals.value,
                  'startDate': new Date(config.date.startDate),
                  'endDate': new Date(config.date.endDate)
                });
              }
              else {
                var config = d.analysisConfigs.filter(x => x.analysisSubType == type)[0];
                var insight = botResult.insights.filter(x => x.analysisSubType == type)[0];
                result.push({
                  'name': type,
                  'currentTotal': insight.data.totals.value,
                  'comparedTotal': insight.comparedData.totals.value,
                  'currentStartDate': new Date(config.date.startDate),
                  'currentEndDate': new Date(config.date.endDate),
                  'comparedStartDate': new Date(config.comparisonDate.startDate),
                  'comparedEndDate': new Date(config.comparisonDate.endDate)
                });
              }
            });
            return result;
          })
          .join('div')
            .attr('class', 'typeOverview');
          
          typeOverview.append('div')
            .attr('class', 'typeTitle')
            .text(d => formatNames(d.name) + ' Insights');
          
          typeOverview.append('div')
            .attr('class', 'typeDetail')
            .each((d, i, nodes) => {
              if (i === 0) {
                d3.select(nodes[i]).append('span')
                  .attr('class', 'typeText')
                  .text(self.dateFormat(d.startDate) + self.enDash() + self.dateFormat(d.endDate));
              }
              else {
                autoFormatMetrics(metricName, d.comparedTotal).then(result => {
                  d3.select(nodes[i]).append('span')
                    .attr('class', 'typeText')
                    .text(self.dateFormat(d.comparedStartDate) + self.enDash() + self.dateFormat(d.comparedEndDate));
                  d3.select(nodes[i]).append('div')
                    .attr('class', 'headerBar notFocus')
                    .style('width', d.comparedTotal / d3.max([d.currentTotal, d.comparedTotal]) * 100 + 'px')
                    .text(result);
                });
              }
            });
          
          typeOverview.append('div')
            .attr('class', 'typeDetail')
            .each((d, i, nodes) => Promise.all([autoFormatNames(metricName), autoFormatMetrics(metricName, d.total), autoFormatMetrics(metricName, d.currentTotal)]).then(results => {
              if (i === 0) {
                d3.select(nodes[i]).append('span')
                  .attr('class', 'typeText')
                  .text('Overall ' + results[0] + ' is ' + results[1]);
              }
              else {
                d3.select(nodes[i]).append('span')
                  .attr('class', 'typeText')
                  .text(self.dateFormat(d.currentStartDate) + self.enDash() + self.dateFormat(d.currentEndDate));
                d3.select(nodes[i]).append('div')
                  .attr('class', 'headerBar focus')
                  .style('width', d.currentTotal / d3.max([d.currentTotal, d.comparedTotal]) * 100 + 'px')
                  .text(results[2]);
              }
            }));
      
      // Header creation done - make it visible!
        setTimeout(() => {
          insightsHeader.transition()
        .style('opacity', 0.975);
        }, 1000);
      
      // Create the insights
        var insights = mainView.selectAll('div.insight')
        .data(botResult.insights, d => d.id)
        .join('div')
          .attr('class', d => 'insight ' + d.analysisType.toLowerCase())
          .style('opacity', 0);
        
        // Create the title
          insights.append('div')
            .attr('class', 'insightTitle')
            .datum(d => Object.entries(d.dimensions))
            .on('mouseenter', d => {
              tooltip
              .style('display', null)
              .each(() => {
                Promise.all(d.map(x => autoFormatNames(x[0]))).then(values => {
                  tooltip.text(values.map((x, i) => [x, d[i][1]].join(' ')).join(' and '));
                });
              });
            })
            .on('mousemove', () => { tooltip.style('top', event.clientY + 'px').style('left', event.clientX + 'px'); })
            .on('mouseleave', () => { tooltip.style('display', 'none'); })
            .selectAll('span')
            .data(d => d)
            .join('span')
              .selectAll('span')
              .data(d => d)
              .join('span')
                .attr('class', (d, i) => ['insightLabel', 'insightName'][i])
                .each((d, i, nodes) => {
                  autoFormatNames(d).then(result => {
                    d3.select(nodes[i]).text(result);
                  });
                });
        
        // Create the insight number label
          insights.append('div')
            .attr('class', 'insightNum')
            .text((d, i) => i + 1);
        
        // Create the insight text summaruy
          var insightSummary = insights.append('div')
            .attr('class', 'insightSummary');
          
          // Create the thumb
            insightSummary.append('svg')
              .attr('class', d => { return 'thumb ' + { 'true': 'positive', 'false': 'negative' }[d.positive]; })
              .attr('viewBox', '0 0 32 32')
              .attr('preserveAspectRatio', 'xMidYMid meet')
              .attr('transform', d => { return {'true': 'scale(1, 1)', 'false': 'scale(1, -1)' }[d.positive]; })
              .attr('transform-origin', 'center center')
              .append('path')
                .attr('d', 'M2.463 32c-1.342 0-2.463-1.121-2.463-2.463v-17.23c0-1.342 1.121-2.461 2.463-2.461h3.696c.911 0 1.709.523 2.134 1.274.831-.509 1.647-.807 2.172-1.11 1.238-.715 1.867-2.727 2.16-4.823.147-1.048.225-2.055.353-2.896.064-.42.128-.793.3-1.199.086-.203.2-.426.437-.654s.654-.437 1.053-.437c1.825 0 3.321.713 4.278 1.807s1.403 2.464 1.644 3.826c.392 2.223.244 4.104.168 5.448h7.442c2.024 0 3.698 1.665 3.698 3.689 0 .718-.204 1.258-.464 2.098s-.613 1.851-1 2.934c-.774 2.167-1.695 4.624-2.297 6.431-.24.722-.553 1.479-1.117 2.134s-1.474 1.17-2.506 1.17h-14.77c-.431 0-.84-.089-1.226-.228v.228c0 1.342-1.119 2.463-2.461 2.463h-3.696zM2.463 29.537h3.696v-17.23h-3.696v17.23zM9.846 27.076h14.77c.33 0 .426-.065.644-.317s.456-.738.646-1.31c.628-1.884 1.55-4.335 2.314-6.474.382-1.07.724-2.061.964-2.836s.356-1.472.356-1.37c0-.703-.535-1.226-1.238-1.226h-8.719c-.683.003-1.238-.554-1.235-1.238 0-1.454.316-4.049-.072-6.248-.194-1.099-.558-2.026-1.081-2.624-.387-.443-.934-.792-1.759-.925-.124.702-.208 1.899-.366 3.023-.321 2.293-.925 5.194-3.379 6.611-.913.527-1.797.834-2.326 1.199s-.745.561-.745 1.427v11.071c0 .703.523 1.235 1.226 1.235h0z');
          
          // Create the text
            insightSummary.append('span')
              .attr('class', d => { return 'explanation ' + { 'true': 'positive', 'false': 'negative' }[d.positive]; })
              .each((d, i, nodes) => {
                autoFormatNames(metricName).then(result => {
                  d3.select(nodes[i]).text(d => { return {
                    'KPI': {
                      'true': 'Over-performing segment',
                      'false': 'Under-performing segment'
                    },
                    'WIA': {
                      'true': 'Caused ' + { 'true': 'an increase', 'false': 'a decrease' }[botResult.insightsBotResultConfig.expectIncreasingTrend] + ' of overall ' + result,
                      'false': 'Caused ' + { 'true': 'a decrease', 'false': 'an increase' }[botResult.insightsBotResultConfig.expectIncreasingTrend] + ' of overall ' + result
                    }
                  }[d.analysisType][d.positive] });
                });
              });
          
          // Create the analysis sub type for change-driver insights
            insightSummary.filter(x => x.analysisType == 'WIA').append('span')
              .attr('class', 'dateRange')
              .on('mouseenter', d => {
                var config = botResult.insightsBotResultConfig.analysisConfigs.filter(x => x.analysisSubType == d.analysisSubType)[0];
                var compareStart = self.dateFormat(new Date(config.comparisonDate.startDate));
                var compareEnd = self.dateFormat(new Date(config.comparisonDate.endDate));
                var thisStart = self.dateFormat(new Date(config.date.startDate));
                var thisEnd = self.dateFormat(new Date(config.date.endDate));
                
                tooltip.style('display', null)
                .text(compareStart + self.enDash() + compareEnd + ' vs. ' + thisStart + self.enDash() + thisEnd);
              })
              .on('mousemove', () => { tooltip.style('top', event.clientY + 'px').style('left', event.clientX + 'px'); })
              .on('mouseleave', () => { tooltip.style('display', 'none'); })
              .text(d => formatNames(d.analysisSubType));
        
        // Create the insight visualisation elements
          var insightViz = insights.append('div')
            .attr('class', 'vizContainer');
          
          // Create the visualisations, starting with performance insights
            var kpiViz = insightViz.filter(x => x.analysisType == 'KPI').selectAll('div')
              .data(d => { return [
                { 'metricName': metricName,
                  'summaryValue': (d.data.value - d.data.totals.value) / d.data.totals.value,
                  'thisValue': d.data.value,
                  'totalValue': d.data.totals.value },
                { 'metricName': volumeMetricName,
                  'summaryValue': d.data.volume / d.data.totals.volume,
                  'thisValue': d.data.volume,
                  'totalValue': d.data.totals.volume }
                ]; })
              .join('div')
                .attr('class', 'kpiViz');
            
            // Create the judgment text
              var kpiVizDesc = kpiViz.append('div')
                .attr('class', 'kpiVizDesc');
              
              kpiVizDesc.append('span')
                .attr('class', 'metricName')
                .each((d, i, nodes) => {
                  autoFormatNames(d.metricName).then(result => {
                    d3.select(nodes[i]).text(result);
                  });
                });
              
              kpiVizDesc.append('span')
                .attr('class', 'metricDesc')
                .text((d, i) => ' is ' + formatMetrics('Percent', d.summaryValue) + [{ 'true': ' above', 'false': ' below' }[d.thisValue > d.totalValue] + ' average.', ' of total.'][i]);
            
            // Create the bars visualisations
              var kpiVizBars = insightViz.selectAll('.kpiViz:nth-child(1)').append('svg')
                .attr('class', 'kpiVizBars')
                .datum(d => {
                  var max = d3.max([d.thisValue, d.totalValue]);
                  return [
                    { 'class': 'focus', 'metricName': d.metricName, 'value': d.thisValue, 'max': max },
                    { 'class': 'notFocus', 'metricName': d.metricName, 'value': d.totalValue, 'max': max }
                  ];
                });
              
              kpiVizBars.selectAll('rect')
              .data(d => d)
              .join('rect')
                .attr('class', d => d.class)
                .attr('x', (d, i) => ['0%', '55%'][i])
                .attr('y', d => (1 - d.value / d.max) * 100 * 0.8 + 20 + '%')
                .attr('width', '45%')
                .attr('height', d => d.value / d.max * 100 * 0.8 + '%');
              
              kpiVizBars.selectAll('text')
              .data(d => d)
              .join('text')
                .attr('class', d => d.class + 'Text')
                .attr('text-anchor', 'middle')
                .attr('x', (d, i) => ['22.5%', '77.5%'][i])
                .attr('y', d => (1 - d.value / d.max) * 100 * 0.8 + 17 + '%')
                .each((d, i, nodes) => {
                  autoFormatMetrics(d.metricName, d.value).then(result => {
                    d3.select(nodes[i]).text(result);
                  });
                });
            
            // Create the pie visualisations
              var kpiVizPie = insightViz.selectAll('.kpiViz:nth-child(2)').append('svg')
                .attr('class', 'kpiVizPie')
                .attr('viewBox', '0 0 65 65')
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .datum(d => [
                  { 'class': 'notFocus', 'metricName': d.metricName, 'value': d.totalValue },
                  { 'class': 'focus', 'metricName': d.metricName, 'value': d.thisValue, 'clipId': Math.random().toString(36).substr(2, 9) }
                ]);
              
              kpiVizPie.append('defs').append('clipPath')
                .attr('id', d => d[1].clipId)
                .append('path')
                  .attr('d', d => {
                    var angle = (d[1].value / d[0].value * 360 - 90) * Math.PI / 180;
                    var largeArc = d[1].value / d[0].value > 0.5 ? 1 : 0;
                    return [
                      'M 32.5 32.5',
                      'L 32.5 0',
                      'A 32.5 32.5 0 ' + largeArc + ' 1 ' + (32.5 + 32.5 * Math.cos(angle)) + ' ' + (32.5 + 32.5 * Math.sin(angle)),
                      'z'
                    ].join(' ');
                  });
              
              kpiVizPie.selectAll('circle')
              .data(d => d)
              .join('circle')
                .attr('class', d => d.class + 'Pie')
                .attr('clip-path', (d, i) => [null, 'url(#' + d.clipId + ')'][i])
                .attr('cx', '32.5')
                .attr('cy', '32.5')
                .attr('r', '26.5');
              
              kpiVizPie.selectAll('text')
              .data(d => d)
              .join('text')
                .attr('class', d => d.class + 'Text')
                .attr('font-size', '9.9')
                .attr('text-anchor', 'middle')
                .attr('x', '32.5')
                .attr('y', (d, i) => ['42.5', '30.5'][i])
                .each((d, i, nodes) => {
                  autoFormatMetrics(d.metricName, d.value).then(result => {
                    d3.select(nodes[i]).text(result);
                  });
                });
          
          // Create the visualisations for change-driver insights
            // Create the division sections
              var wiaDivisions = insightViz.filter(x => x.analysisType == 'WIA').selectAll('div')
              .data(d => { return [
                { 'name': numMetricName,
                  'positive': d.positive,
                  'current': d.data.numeratorValue,
                  'currentTotal': d.data.totals.numeratorValue,
                  'compare': d.comparedData.numeratorValue,
                  'compareTotal': d.comparedData.totals.numeratorValue },
                { 'name': denomMetricName,
                  'positive': d.positive,
                  'current': d.data.denominatorValue,
                  'currentTotal': d.data.totals.denominatorValue,
                  'compare': d.comparedData.denominatorValue,
                  'compareTotal': d.comparedData.totals.denominatorValue }
              ]; })
              .join('div')
                .attr('class', 'wiaDivisions');
              
              // Create the judgment text
                var wiaDivisionsVizDesc = wiaDivisions.append('div')
                  .attr('class', 'wiaVizDesc');
                
                var wiaDivisionsNewSegments = wiaDivisionsVizDesc.filter(d => d.current === 0 || d.compare === 0);
                
                wiaDivisionsNewSegments.append('span')
                  .attr('class', 'metricName')
                  .each((d, i, nodes) => {
                    autoFormatNames(d.name).then(result => {
                      d3.select(nodes[i]).text(result);
                    });
                  });
                
                wiaDivisionsNewSegments.append('span')
                  .attr('class', 'metricDesc')
                  .text(d => { return { 'true': ' stopped', 'false': ' started' }[d.current === 0] + ' delivering.'; });
                
                var wiaDivisionsOtherSegments = wiaDivisionsVizDesc.filter(x => x.current !== 0 && x.compare !== 0);
                
                wiaDivisionsOtherSegments.append('span')
                  .attr('class', 'metricName')
                  .each((d, i, nodes) => {
                    autoFormatNames(d.name).then(result => {
                      d3.select(nodes[i]).text(result);
                    });
                  });
                
                wiaDivisionsOtherSegments.append('span')
                  .attr('class', 'metricDesc')
                  .text(d => { return { 'true': ' increased', 'false': ' decreased' }[d.current > d.compare] + ' by ' + formatMetrics('Percent', (d.current - d.compare) / d.compare) + '.'; });
              
              // Create the change visualisations
                wiaDivisionsViz = wiaDivisions.append('svg')
                  .attr('class', 'wiaViz')
                  .datum(d => {
                    var max = d3.max([d.compareTotal, d.currentTotal]);
                    return [
                      { 'name': d.name, 'class': 'notFocus', 'value': d.compareTotal, 'max': max },
                      { 'name': d.name, 'class': 'focus', 'value': d.compare, 'max': max },
                      { 'name': d.name, 'class': 'notFocus', 'value': d.currentTotal, 'max': max },
                      { 'name': d.name, 'class': 'focus', 'value': d.current, 'max': max }
                    ];
                  });
                
                wiaDivisionsViz.selectAll('rect')
                .data(d => d)
                .join('rect')
                  .attr('class', d => d.class)
                  .attr('x', (d, i) => ['0%', '0%', '60%', '60%'][i])
                  .attr('y', d => (1 - d.value / d.max) * 100 * 0.8 + 20 + '%')
                  .attr('width', '40%')
                  .attr('height', d => d.value / d.max * 100 * 0.8 + '%');
                
                wiaDivisionsViz.selectAll('text')
                .data(d => d)
                .join('text')
                  .attr('class', d => d.class + 'Text')
                  .attr('text-anchor', 'middle')
                  .attr('x', (d, i) => ['20%', '20%', '80%', '80%'][i])
                  .attr('y', d => (1 - d.value / d.max) * 100 * 0.8 + 17 + '%')
                  .each((d, i, nodes) => {
                    if (d.value !== 0) {
                      autoFormatMetrics(d.name, d.value).then(result => {
                        d3.select(nodes[i]).text(result);
                      });
                    }
                  });
                
                wiaDivisionsViz.append('text')
                  .attr('class', 'arrowText')
                  .attr('text-anchor', 'middle')
                  .attr('x', '50%')
                  .attr('y', '60%')
                  .text(String.fromCharCode(0x25ba));
              
            // Create the result section
              var wiaResult = insightViz.filter(x => x.analysisType == 'WIA').append('div')
                .attr('class', 'wiaResult');
              
              // Create the judgment text
                var wiaResultVizDesc = wiaResult.append('div')
                  .attr('class', 'wiaVizDesc');
                
                var wiaResultNewSegments = wiaResultVizDesc.filter(x => x.comparedData.value === 0 || x.data.value === 0);
                
                wiaResultNewSegments.append('span')
                  .attr('class', 'metricDescription')
                  .text('Segment ');
                
                wiaResultNewSegments.append('span')
                  .attr('class', 'metricName')
                  .text(d => { return { 'true': 'is new', 'false': 'stopped' }[d.comparedData.value === 0]; });
                
                wiaResultNewSegments.append('span')
                  .attr('class', 'metricDescription')
                  .text(d => { return ' and is performing ' + { 'true': 'well.', 'false': 'badly.' }[d.positive]; });
                
                var wiaResultOtherSegments = wiaResultVizDesc.filter(x => x.comparedData.value !== 0 && x.data.value !== 0);
                
                wiaResultOtherSegments.append('span')
                  .attr('class', 'metricName')
                  .each((d, i, nodes) => {
                    autoFormatNames(metricName).then(result => {
                      d3.select(nodes[i]).text(result);
                    });
                  });
                
                wiaResultOtherSegments.append('span')
                  .attr('class', 'metricDesc')
                  .text(d => { return { 'true': ' increased', 'false': ' decreased' }[d.data.value > d.comparedData.value] + ' by ' + formatMetrics('Percent', (d.data.value - d.comparedData.value) / d.comparedData.value) + '.'; });
                
              // Create the result visualisation
                var wiaResultViz = wiaResult.append('svg')
                  .attr('class', 'wiaViz')
                  .datum(d => {
                    var max = d3.max([d.comparedData.value, d.comparedData.totals.value, d.data.value, d.data.totals.value]);
                    return [
                      { 'class': 'focus', 'value': d.comparedData.value, 'max': max },
                      { 'class': 'notFocus', 'value': d.comparedData.totals.value, 'max': max },
                      { 'class': 'focus', 'value': d.data.value, 'max': max },
                      { 'class': 'notFocus', 'value': d.data.totals.value, 'max': max }
                    ];
                  });
                
                wiaResultViz.selectAll('rect')
                .data(d => d)
                .join('rect')
                  .attr('class', d => d.class)
                  .attr('x', (d, i) => ['0%', '25%', '55%', '80%'][i])
                  .attr('y', d => (1 - d.value / d.max) * 100 * 0.8 + 20 + '%')
                  .attr('width', '20%')
                  .attr('height', d => d.value / d.max * 100 * 0.8 + '%');
                
                wiaResultViz.selectAll('text')
                .data(d => d)
                .join('text')
                  .attr('class', d => d.class + 'Text')
                  .attr('text-anchor', 'middle')
                  .attr('x', (d, i) => ['10%', '35%', '65%', '90%'][i])
                  .attr('y', d => (1 - d.value / d.max) * 100 * 0.8 + 17 + '%')
                  .each((d, i, nodes) => {
                    autoFormatMetrics(metricName, d.value).then(result => {
                      d3.select(nodes[i]).text(result);
                    });
                  });
                
                wiaResultViz.append('text')
                  .attr('class', 'arrowText')
                  .attr('text-anchor', 'middle')
                  .attr('x', '50%')
                  .attr('y', '60%')
                  .text(String.fromCharCode(0x25ba));
      
      // Insights creation done - make them visible!
        setTimeout(() => {
          insights.transition()
          .style('opacity', 1);
        }, 1000);
  },
  'filterInsightsList': function() {
    // Function to filter out displayed insights
      var type = d3.select('#selectType').node().selectedOptions[0].value;
      var dimension = d3.select('#selectDimensions').node().selectedOptions[0].value;
      var positive = d3.select('#selectPos').node().selectedOptions[0].value;
      var factor = d3.select('#selectFactor').node().selectedOptions[0].value;
      
      d3.selectAll('.insight')
      .style('display', null)
      .filter(x => {
        var typeCheck = true;
        if (type == 'KPI' && type != 'All') {
          typeCheck = x.analysisType == type;
        }
        else if (type != 'All') {
          typeCheck = x.analysisSubType == type;
        }
        
        var dimCheck = true;
        if (dimension != 'All') {
          dimCheck = x.dimensions.hasOwnProperty(dimension);
        }
        
        var posCheck = true;
        if (positive != 'All' && positive == 'Positive') {
          posCheck = x.positive === true;
        }
        else if (positive != 'All' && positive == 'Negative') {
          posCheck = x.positive === false;
        }
        
        var factorCheck = true;
        if (factor != 'All' && factor == 'Single') {
          factorCheck = Object.keys(x.dimensions).length === 1;
        }
        else if (factor != 'All' && factor == 'Combo') {
          factorCheck = Object.keys(x.dimensions).length > 1;
        }
        
        if (typeCheck && dimCheck && posCheck && factorCheck) {
          return false;
        }
        else {
          return true;
        }
      })
      .style('display', 'none');
  },
  'filterBotResult': function(botResult) {
    // Function to remove remove hidden insights
      botResult.insights = botResult.insights.filter(insight => {
        var choice = true;
        botResult.hiddenInsightsCriteria.forEach(criterion => {
          if (insight.analysisType == criterion.type &&
              insight.analysisSubType == criterion.subType &&
              JSON.stringify(insight.dimensions) == JSON.stringify(criterion.dimensions)) {
                choice = false;
              }
        });
        return choice;
      });
      
      return botResult;
  },
  'dateFormat': function(date) {
    return date.toLocaleString('default', { day: 'numeric', month: 'short', year: 'numeric' });
  },
  'enDash': function() {
    return ' ' + String.fromCharCode(0x2013) + ' ';
  },
  'botsFirst': async function() {
    var self = this;
    self.createBots(await self.getBotList());
  },
  'insightsFirst': function(botId) {
    var self = this;
    self.getBotResults(botId).then(botResult => {
      self.createInsights(self.filterBotResult(botResult));
    });
  },
  'initialize': function() {
    var self = this;
    // Create prefs and functions if they haven't been set
      if (typeof prefs === 'undefined') {
        prefs = {
          'restrictToBots': [], // Comma-separated bot IDs
          'loadDefaultBot': {
            'botId': null, // Bot ID if using, otherwise null
            'lockedToBot': false // true or false
          },
          'basicNames': false
        };
      }
      
      if (typeof formatNames === 'undefined') {
        formatNames = function(name) {
          return name;
        }
      }
      
      if (typeof formatMetrics === 'undefined') {
        formatMetrics = function(name, metric) {
          return metric;
        }
      }
    
    // Create fallback functions for automated names and formats
      autoFormatNames = function(name) {
        if (formatNames(name) !== name || prefs.basicNames === true) {
          return new Promise((resolve, reject) => {
            resolve(formatNames(name));
          });
        }
        else {
          return new Promise((resolve, reject) => {
            DA.query.getFieldDetails({
              systemName: name,
              cb: (err, data) => {
                if (typeof data === 'object') {
                  resolve(data.name);
                }
                else {
                  resolve(name);
                }
              }
            });
          });
        }
      }
      
      autoFormatMetrics = function(name, value) {
        if (formatMetrics(name, value) !== value) {
          return new Promise((resolve, reject) => {
            resolve(formatMetrics(name, value));
          });
        }
        else {
          return new Promise((resolve, reject) => {
            DA.query.getFormattedValue({
              systemName: name,
              value: value,
              cb: (err, data) => {
                resolve(data);
              }
            });
          });
        }
      }
    
    // Create the page structure and set some global variables
      var emiTitle = d3.select('#__da-app-content').append('div')
        .attr('id', 'emiTitle');
      
      emiTitle.append('svg')
        .attr('id', 'logo')
        .attr('viewBox', '0 0 15 15')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .append('g')
          .attr('transform', 'translate(.5)')
          .selectAll('path')
          .data([
            'M9.83 5.3C10.48 5.3 11 4.76 11 4.11c0-.66-.53-1.19-1.18-1.19-.65 0-1.18.53-1.18 1.19S9.18 5.3 9.83 5.3L9.83 5.3zM9.83 3.56c.3 0 .54.24.54.54s-.24.54-.54.54c-.3 0-.54-.24-.54-.54C9.29 3.81 9.53 3.56 9.83 3.56z',
            'M5.14 12.86c-1.11 0-2.14-.64-2.64-1.64-.1.01-.19.02-.29.02-1.5 0-2.72-1.23-2.72-2.74 0-.74.26-1.51.73-2.1.12-.15.25-.3.39-.42-.07-.25-.1-.49-.1-.71 0-.87.31-1.66.86-2.22-.01-.05-.02-.1-.02-.16 0-.36.29-.65.64-.65.15 0 .29.05.4.14C2.7 2.25 3 2.18 3.32 2.15 3.4 2.14 3.48 2.14 3.55 2.14c1.01 0 1.8.62 2.21 1.04.55-.51 1.04-.7 1.83-.7.4 0 .77.07 1.1.21.13.05.19.2.14.33C8.8 3.12 8.71 3.18 8.61 3.18 8.23 3.05 7.92 3 7.6 3 6.93 3 6.57 3.13 6.11 3.57c.1.12.19.25.27.38C6.7 4.44 7.03 4.98 7.38 5.6c.29-.3.58-.56.89-.81C8.29 4.78 8.4 4.73 8.43 4.73c.08 0 .15.04.2.1.04.04.06.11.06.18-.01.07-.04.14-.1.18C8.27 5.45 7.96 5.73 7.64 6.06 8.2 7.1 8.56 7.89 8.6 7.98c.51 1.04 1.17 1.67 1.94 1.87.22-.34.33-.73.33-1.11.04-1.15-.31-2.19-.56-2.96-.07-.21.01-.36.14-.4.01 0 .03 0 .04 0 .16 0 .25.07.28.17.3.89.66 1.98.62 3.2 0 .4-.1.8-.29 1.17 1.59-.02 2.88-1.33 2.88-2.94 0-1.47-1.08-2.72-2.52-2.92-.14-.02-.24-.15-.22-.29.02-.13.13-.22.25-.22 1.72.23 3 1.7 3.01 3.43 0 1.91-1.54 3.46-3.42 3.46-.1 0-.2 0-.3-.01-.08.09-.16.18-.25.27-.53.51-1.25.8-1.97.8-.29 0-.57-.02-.86-.05C7.24 12.33 6.29 12.86 5.14 12.86zM3.02 11.11c.44.77 1.23 1.24 2.11 1.24.9 0 1.63-.36 2.03-1-.99-.19-1.94-.56-2.84-1.13-.2.22-.4.39-.59.54C3.5 10.92 3.26 11.03 3.02 11.11zM7.88 10.94c.22.02.44.03.66.03.6 0 1.19-.25 1.64-.69C9.37 9.99 8.68 9.29 8.14 8.2 8.13 8.18 7.81 7.47 7.27 6.46 7.1 6.65 6.93 6.84 6.78 7.04c.76.85 1.21 2.24 1.21 3.11C7.99 10.41 7.96 10.68 7.88 10.94zM4.66 9.83c.86.53 1.77.87 2.71 1.03.07-.23.11-.47.11-.72 0-.83-.45-2.01-1.02-2.69C6.26 7.7 6.07 7.95 5.89 8.2L5.87 8.23c.06.1.09.21.09.32 0 .36-.29.65-.64.65-.05 0-.1-.01-.15-.02C4.99 9.41 4.83 9.63 4.66 9.83zM.8 6.49C.74 6.56.68 6.63.62 6.71.22 7.21 0 7.86 0 8.49c0 1.23.99 2.23 2.2 2.23.03 0 .06 0 .1 0-.08-.28-.12-.56-.12-.84.01-.41.08-.84.21-1.3C1.96 8.21 1.54 7.7 1.17 7.17 1.1 7.07.94 6.82.8 6.49zM2.8 9.05c-.06.3-.1.57-.11.83 0 .25.04.51.12.75.21-.06.42-.16.62-.29.15-.11.3-.25.45-.4C3.51 9.68 3.15 9.38 2.8 9.05zM2.94 8.49C3.35 8.9 3.78 9.26 4.22 9.56c.18-.21.35-.44.53-.68C4.7 8.78 4.67 8.67 4.67 8.56c0-.36.29-.65.64-.65.05 0 .1.01.14.01.2-.27.41-.55.62-.83L6.06 7.07c-.04-.04-.72-.73-1.9-1.09C3.6 6.86 3.19 7.7 2.94 8.49zM1.21 6.15c.1.26.23.52.38.73.29.41.61.8.95 1.18.25-.7.62-1.44 1.1-2.21C3.36 5.8 3.06 5.78 2.75 5.78c-.18 0-.36.01-.54.03L2.19 5.7 2.2 5.81C1.85 5.83 1.52 5.95 1.21 6.15zM4.47 5.54C5.6 5.91 6.26 6.55 6.39 6.68c0 0 .01.01.01.01.19-.24.39-.47.6-.7C6.65 5.34 6.29 4.75 5.94 4.23c-.06-.1-.13-.2-.19-.29L5.58 4.13C5.14 4.63 4.8 5.08 4.47 5.54zM1.69 3.44C1.24 3.95 1.02 4.56 1.02 5.26c0 .11.01.24.04.38.34-.2.71-.31 1.1-.34.21-.02.41-.04.61-.04.39 0 .79.04 1.18.13C4.31 4.86 4.7 4.35 5.12 3.86L5.4 3.54C5.05 3.18 4.39 2.65 3.55 2.65c-.06 0-.13.01-.19.01-.25.02-.5.08-.73.16 0 .01 0 .03 0 .04 0 .36-.29.65-.64.65C1.89 3.51 1.78 3.49 1.69 3.44'
          ])
          .join('path')
            .attr('d', d => { return d; });
      
      emiTitle.append('span')
        .text('Einstein Marketing Insights');
      
      mainView = d3.select('#__da-app-content').append('div')
        .attr('id', 'mainView');
      bots = null;
      tooltip = d3.select('#__da-app-content').append('div')
        .attr('id', 'tooltip')
        .style('position', 'absolute')
        .style('display', 'none');
      loaded = null;
    
    // Load it up
      if (prefs.loadDefaultBot.botId === null) {
        self.botsFirst();
      }
      else {
        self.insightsFirst(prefs.loadDefaultBot.botId);
      }
  }
}