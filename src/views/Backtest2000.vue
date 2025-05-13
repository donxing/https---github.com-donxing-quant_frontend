<template>
  <div class="backtest2000">
    <h1>中证2000回测设置</h1>
    <div id="backtest-container">
      <vue-date-picker
        v-model="dateRange"
        range
        format="yyyy-MM-dd"
        placeholder="选择日期范围"
        :locale="locale"
        :enable-time-picker="false"
        :clearable="true"
        class="date-picker"
      />
      <div id="backtest-params">
        <label>
          初始资金:
          <input
            type="number"
            v-model.number="initialCash"
            placeholder="初始资金"
            min="1000"
            step="1000"
          />
        </label>
        <label>
          止损百分比:
          <input
            type="number"
            v-model.number="stopLossPct"
            placeholder="止损%"
            min="0"
            max="100"
            step="0.1"
          />
        </label>
        <label>
          最长持仓天数:
          <input
            type="number"
            v-model.number="maxHoldingDays"
            placeholder="持仓天数"
            min="1"
            step="1"
          />
        </label>
        <label>
          止盈百分比:
          <input
            type="number"
            v-model.number="takeProfitPct"
            placeholder="止盈%"
            min="0"
            max="100"
            step="0.1"
          />
        </label>
        <label>
          Buy Score 买入阈值:
          <input
            type="number"
            v-model.number="buyScoreThreshold"
            placeholder="Buy Score 阈值"
            min="0"
            step="0.1"
          />
        </label>
      </div>
      <button @click="runBacktest" :disabled="loading || !dateRange">
        {{ loading ? '回测中...' : '运行中证2000回测' }}
      </button>
    </div>
    <div v-if="backtestResult" class="backtest-result">
      <h2>回测结果</h2>
      <p>初始资金: {{ backtestResult.summary.initial_cash }}</p>
      <p>最终资金: {{ backtestResult.summary.final_value }}</p>
      <p>总回报率: {{ backtestResult.summary.total_return_pct }}%</p>
      <p>交易次数: {{ backtestResult.summary.number_of_trades }}</p>
      <p>胜率: {{ backtestResult.summary.win_rate_pct }}%</p>
      <p>交易记录文件: <a :href="backtestResult.result_file" download>下载Parquet文件</a></p>
    </div>
    <div v-if="backtestTrades.length > 0" class="backtest-visualization">
      <h2>回测交易和收益</h2>
      <div ref="tradeChart" id="trade-chart"></div>
      <h3>交易记录</h3>
      <table class="backtest-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>股票代码</th>
            <th>类型</th>
            <th>价格</th>
            <th>股数</th>
            <th>现金</th>
            <th>持仓</th>
            <th>投资组合价值</th>
            <th>收益</th> <!-- Added Profit Column -->
          </tr>
        </thead>
        <tbody>
          <tr v-for="trade in backtestTrades" :key="trade.date + trade.code + trade.type">
            <td>{{ trade.date }}</td>
            <td>{{ trade.code }}</td>
            <td>{{ trade.type }}</td>
            <td>{{ trade.price.toFixed(2) }}</td>
            <td>{{ trade.shares }}</td>
            <td>{{ trade.cash.toFixed(2) }}</td>
            <td>{{ trade.position }}</td>
            <td>{{ trade.portfolio_value.toFixed(2) }}</td>
            <td>{{ trade.profit ? trade.profit.toFixed(2) : '0.00' }}</td> <!-- Display Profit -->
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import api from '../services/api'

export default {
  name: 'Backtest2000',
  components: {
    VueDatePicker
  },
  data() {
    return {
      dateRange: null,
      initialCash: 1000000,
      stopLossPct: 5,
      maxHoldingDays: 30,
      takeProfitPct: 10,
      buyScoreThreshold: 5,  // Default buy_score threshold
      tradeChart: null,
      loading: false,
      error: '',
      locale: 'zh-CN',
      backtestResult: null,
      backtestTrades: [],
      indexData: []
    }
  },
  mounted() {
    this.loadQueryParams()
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    if (this.tradeChart) {
      this.tradeChart.dispose()
      this.tradeChart = null
    }
  },
  methods: {
    handleResize() {
      if (this.tradeChart) {
        this.tradeChart.resize()
      }
    },
    loadQueryParams() {
      const { startDate, endDate } = this.$route.query
      if (startDate && endDate) {
        this.dateRange = [new Date(startDate), new Date(endDate)]
      }
    },
    async loadIndexData() {
      if (!this.dateRange || !this.dateRange[0] || !this.dateRange[1]) {
        this.error = '请选择日期范围'
        return
      }

      this.loading = true
      this.error = ''
      try {
        const response = await api.get('/api/index/csi2000', {
          params: {
            start_date: this.formatDate(this.dateRange[0]),
            end_date: this.formatDate(this.dateRange[1])
          }
        })
        const data = response.data.data
        if (data && data.length > 0) {
          this.indexData = data.map(item => ({
            date: item.date,
            close: parseFloat(item.close)
          }))
        } else {
          this.indexData = []
          this.error = '未找到中证2000指数数据'
        }
      } catch (error) {
        this.indexData = []
        this.error = error.response?.data?.detail || '获取指数数据失败'
        console.error('获取指数数据失败:', error)
      } finally {
        this.loading = false
      }
    },
    async runBacktest() {
      if (!this.dateRange || !this.dateRange[0] || !this.dateRange[1]) {
        this.error = '请选择日期范围'
        return
      }
      if (this.initialCash < 1000) {
        this.error = '初始资金不得低于1000'
        return
      }
      if (this.stopLossPct < 0 || this.stopLossPct > 100) {
        this.error = '止损百分比必须在0-100之间'
        return
      }
      if (this.takeProfitPct < 0 || this.takeProfitPct > 100) {
        this.error = '止盈百分比必须在0-100之间'
        return
      }
      if (this.maxHoldingDays < 1) {
        this.error = '最长持仓天数必须大于0'
        return
      }
      if (this.buyScoreThreshold < 0) {
        this.error = 'Buy Score 阈值必须大于或等于0'
        return
      }

      this.loading = true
      this.error = ''
      this.backtestResult = null
      this.backtestTrades = []

      try {
        const payload = {
          stock_code: null,
          start_date: this.formatDate(this.dateRange[0]),
          end_date: this.formatDate(this.dateRange[1]),
          initial_cash: this.initialCash,
          position_size: 0.1,
          stop_loss_pct: this.stopLossPct,
          max_holding_days: this.maxHoldingDays,
          take_profit_pct: this.takeProfitPct,
          buy_score_threshold: this.buyScoreThreshold
        }

        const response = await api.post('/api/backtest2000/', payload)
        this.backtestResult = response.data
        const tradesResponse = await api.get('/api/backtest2000/results')
        this.backtestTrades = tradesResponse.data
        await this.loadIndexData()

        this.$nextTick(() => {
          if (this.$refs.tradeChart && this.$refs.tradeChart.offsetWidth > 0) {
            try {
              this.tradeChart = echarts.init(this.$refs.tradeChart)
              window.addEventListener('resize', this.handleResize)
              console.log('ECharts initialized successfully')
            } catch (e) {
              console.error('Failed to initialize ECharts:', e)
              this.error = '无法初始化图表，请刷新页面重试'
              return
            }
          } else {
            console.warn('tradeChart DOM not ready or has invalid dimensions')
            this.error = '图表容器不可用，请检查页面布局'
            return
          }
          this.renderTradeChart()
        })
      } catch (error) {
        this.error = error.response?.data?.detail || '运行回测失败'
        console.error('运行回测失败:', error)
      } finally {
        this.loading = false
      }
    },
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    renderTradeChart() {
      if (!this.indexData.length || !this.backtestTrades.length || !this.tradeChart) {
        console.warn('Cannot render chart: missing data or chart instance', {
          indexData: this.indexData.length,
          backtestTrades: this.backtestTrades.length,
          tradeChart: !!this.tradeChart
        })
        this.tradeChart?.clear()
        return
      }

      console.log('Rendering chart with data:', {
        indexDataCount: this.indexData.length,
        tradeCount: this.backtestTrades.length
      })

      const dates = this.indexData.map(item => item.date)
      const closePrices = this.indexData.map(item => item.close)

      const portfolioValues = new Array(dates.length).fill(null)
      let lastValue = this.backtestResult.summary.initial_cash
      this.backtestTrades.forEach(trade => {
        const dateIndex = dates.indexOf(trade.date)
        if (dateIndex !== -1) {
          portfolioValues[dateIndex] = parseFloat(trade.portfolio_value)
          lastValue = parseFloat(trade.portfolio_value)
        }
      })
      for (let i = 0; i < portfolioValues.length; i++) {
        if (portfolioValues[i] === null && i > 0) {
          portfolioValues[i] = portfolioValues[i - 1] || lastValue
        } else if (portfolioValues[i] === null) {
          portfolioValues[i] = lastValue
        }
      }

      const tradeMarkers = this.backtestTrades.map(trade => {
        const dateIndex = dates.indexOf(trade.date)
        if (dateIndex === -1) return null
        return {
          name: `${trade.code} ${trade.type}`,
          coord: [dateIndex, parseFloat(trade.price)],
          symbol: 'circle',
          symbolSize: 10,
          itemStyle: { color: trade.type === 'BUY' ? 'red' : 'green' },
          label: { show: false },
          tooltip: { value: `${trade.code} ${trade.type} @ ${trade.price.toFixed(2)}` }
        }
      }).filter(marker => marker !== null)

      const option = {
        animation: false,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          formatter: function(params) {
            const date = params[0].axisValue
            const close = params[0].data || 'N/A'
            const portfolio = params[1].data || 'N/A'
            let html = `<div style="font-weight:bold">${date}</div>`
            html += `中证2000指数: ${close !== 'N/A' ? close.toFixed(2) : 'N/A'}<br>`
            html += `投资组合价值: ${portfolio !== 'N/A' ? portfolio.toFixed(2) : 'N/A'}<br>`
            const trades = this.backtestTrades.filter(t => t.date === date)
            if (trades.length > 0) {
              html += `<br>交易:<br>`
              trades.forEach(t => {
                html += `${t.code} ${t.type} @ ${t.price.toFixed(2)}, 股数: ${t.shares}<br>`
              })
            }
            return html
          }.bind(this)
        },
        axisPointer: {
          link: { xAxisIndex: 'all' },
          label: { backgroundColor: '#777' }
        },
        grid: [
          { left: '10%', right: '10%', top: '10%', height: '70%' }
        ],
        xAxis: [
          {
            type: 'category',
            data: dates,
            scale: true,
            boundaryGap: false,
            axisLine: { onZero: false },
            splitLine: { show: false },
            splitNumber: 20,
            min: 'dataMin',
            max: 'dataMax'
          }
        ],
        yAxis: [
          {
            scale: true,
            splitArea: { show: true },
            name: '指数点位',
            position: 'left'
          },
          {
            scale: true,
            splitArea: { show: true },
            name: '投资组合价值',
            position: 'right'
          }
        ],
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0],
            start: 0,
            end: 100
          },
          {
            show: true,
            xAxisIndex: [0],
            type: 'slider',
            top: '90%',
            start: 0,
            end: 100
          }
        ],
        series: [
          {
            name: '中证2000指数',
            type: 'line',
            data: closePrices,
            yAxisIndex: 0,
            lineStyle: { color: '#5470C6' },
            markPoint: { data: tradeMarkers }
          },
          {
            name: '投资组合价值',
            type: 'line',
            data: portfolioValues,
            yAxisIndex: 1,
            lineStyle: { color: '#91CC75' }
          }
        ]
      }

      this.tradeChart.setOption(option)
    }
  }
}
</script>

<style scoped>
.backtest2000 {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

#backtest-container {
  margin-bottom: 20px;
}

#backtest-container .date-picker {
  display: inline-block;
  width: 200px;
  padding: 8px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  vertical-align: middle;
}

#backtest-container button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

#backtest-container button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

#backtest-params {
  margin: 10px 0;
}

#backtest-params label {
  margin-right: 15px;
}

#backtest-params input {
  width: 100px;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

#trade-chart {
  width: 100%;
  height: 400px;
  margin-top: 20px;
  min-height: 400px;
}

.error {
  color: red;
  margin-top: 10px;
}

.backtest-result {
  margin-top: 20px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.backtest-result h2 {
  font-size: 18px;
  margin-bottom: 10px;
}

.backtest-result p {
  margin: 5px 0;
}

.backtest-result a {
  color: #007bff;
  text-decoration: underline;
}

.backtest-visualization {
  margin-top: 20px;
}

.backtest-visualization h2,
.backtest-visualization h3 {
  font-size: 18px;
  margin-bottom: 10px;
}

.backtest-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

.backtest-table th,
.backtest-table td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: right;
}

.backtest-table th {
  background-color: #f4f4f4;
}

.backtest-table td:first-child,
.backtest-table th:first-child,
.backtest-table td:nth-child(2),
.backtest-table th:nth-child(2) {
  text-align: left;
}
</style>