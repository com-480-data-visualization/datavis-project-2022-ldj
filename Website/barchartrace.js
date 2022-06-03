// console.log(dataOri);
const width = 1200, height = 600, margin = { top: 20, bottom: 0, left: 100, right: 100 };
const chartWidth = width - (margin.left + margin.right), chartHeight = height - (margin.top + margin.bottom);
const data = [];
const count = 10;
const duration = 1000;
const barPadding = 20;
const barHeight = (chartHeight - (barPadding * count)) / count;
const getDate = () => dataOri[0][dateIndex];
let dateIndex = 0;
let date = getDate();
let dataSlice = [];
let chart = null, scale = null, axis = null, svg = null, dateTitle = null;

// create SVG
const createSvg = () => svg = d3.select('#chart').append('svg').attr('width', width).attr('height', height);

// formatting
const formatData = () => {
  dataOri[0].forEach((date, index) => {
    if (index > 0) {
      dataOri.forEach((row, rowIndex) => {
        if (rowIndex > 0) {
          data.push({
            name: row[0],
            value: Number(row[index]),
            lastValue: index > 1 ? Number(row[index - 1]) : 0,
            date: date,
            color: randomRgbColor()
          });
        }
      });
    }
  });
}

// get current data and rank in descending order
const sliceData = () =>
  dataSlice = data.filter(d => d.date === date).sort((a, b) => b.value - a.value).slice(0, count);

// create scale
const createScale = () =>
  scale = d3.scaleLinear().domain([0, d3.max(dataSlice, d => d.value)]).range([0, chartWidth]);

// create axis
const renderAxis = () => {
  createScale();

  axis = d3.axisTop().scale(scale).ticks(5).tickPadding(10).tickSize(0);

  svg.append('g')
    .classed('axis', true)
    .style('transform', `translate3d(${margin.left}px, ${margin.top}px, 0)`)
    .call(axis);
}

// create axis line
const renderAxisLine = () => {
  d3.selectAll('g.axis g.tick').select('line.grid-line').remove();
  d3.selectAll('g.axis g.tick').append('line')
    .classed('grid-line', true)
    .attr('stroke', 'black')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', chartHeight);
}

// update axis
const updateAxis = () => {
  createScale();

  axis.scale().domain([0, d3.max(dataSlice, d => d.value)]);

  svg.select('g.axis')
    .transition().duration(duration).ease(d3.easeLinear)
    .call(axis);

  d3.selectAll('g.axis g.tick text').attr('font-size', 14);
}

// render date title
const renderDateTitle = () => {
  dateTitle = svg.append('text')
    .classed('date-title', true)
    .text(date)
    .attr('x', chartWidth - margin.top)
    .attr('y', chartHeight - margin.left)
    .attr('fill', 'rgb(128, 128, 128)')
    .attr('font-size', 40)
    .attr('text-anchor', 'end')
}

const calTranslateY = (i, end) => {
  if (dateIndex === 1 || end) {
    return (barHeight + barPadding) * i + (barPadding / 2);
  } else {
    return (barHeight + barPadding) * (count + 1);
  }
}

const createChart = () => {
  chart = svg.append('g')
    .classed('chart', true)
    .style('transform', `translate3d(${margin.left}px, ${margin.top}px, 0)`);
}

const renderChart = () => {
  const bars = chart.selectAll('g.bar').data(dataSlice, (d) => d.name);

  let barsEnter;

  barsEnter = bars.enter()
    .append('g')
    .classed('bar', true)
    .style('transform', (d, i) => `translate3d(0, ${calTranslateY(i)}px, 0)`);

  dateIndex > 1 && barsEnter
    .transition().duration(this.duration)
    .style('transform', (d, i) => `translate3d(0, ${calTranslateY(i, 'end')}px, 0)`);

  barsEnter.append('rect')
    .style('width', d => scale(d.value))
    .style('height', barHeight + 'px')
    .style('fill', d => d.color);

  barsEnter.append('text')
    .classed('label', true)
    .text(d => d.name)
    .attr('x', '-5')
    .attr('y', barPadding)
    .attr('font-size', 14)
    .style('text-anchor', 'end');

  barsEnter.append('text')
    .classed('value', true)
    .text(d => d.value)
    .attr('x', d => scale(d.value) + 10)
    .attr('y', barPadding);

  // update
  bars.transition().duration(duration).ease(d3.easeLinear)
    .style('transform', (d, i) => 'translate3d(0, ' + calTranslateY(i, 'end') + 'px, 0)')
    .select('rect')
    .style('width', d => scale(d.value) + 'px');

  bars
    .select('text.value')
    .transition().duration(duration).ease(d3.easeLinear)
    .attr('x', d => scale(d.value) + 10)
    .tween('text', function (d) {
      const textDom = this;
      const i = d3.interpolateRound(d.lastValue, d.value);
      return (t) => textDom.textContent = i(t);
    });

  // exit
  bars.exit()
    .transition().duration(duration).ease(d3.easeLinear)
    .style('transform', function (d, i) {
      return 'translate3d(0, ' + calTranslateY(i) + 'px, 0)';
    })
    .style('width', function (d) {
      return scale(d.value) + 'px';
    })
    .remove();
}
// random color
function randomRgbColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `rgb(${r},${g},${b})`;
}
// create ticker
function createTicker() {
  const ticker = d3.interval(() => {
    if (dateIndex < dataOri[0].length - 1) {
      dateIndex++;
      date = getDate();
      dateTitle.text(date);
      sliceData();
      updateAxis();
      renderAxisLine();
      renderChart();
    } else {
      ticker.stop();
    }
  }, duration);
}

const init = () => {
  createSvg(); // create svg
  formatData(); // formatting
  sliceData(); // get current data
  renderAxis(); // render axis
  renderAxisLine(); // render axis line
  renderDateTitle(); // render date
  createChart(); // create chart
  renderChart(); // render chart
  createTicker(); // create tiker
}

// document.getElementById("rankButton").onclick = () => {
//   document.location.reload();
// };

init();
    







 