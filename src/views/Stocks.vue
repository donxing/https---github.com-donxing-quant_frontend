<template>
  <div class="stocks">
    <h1>股票K线图</h1>
    <div id="search-container">
      <input
        type="text"
        v-model="stockCode"
        placeholder="请输入股票代码"
        @keyup.enter="loadStockData"
      />
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
      <button @click="loadStockData" :disabled="loading">
        {{ loading ? '加载中...' : '搜索' }}
      </button>
      <button @click="goToBacktest" :disabled="!stockCode || !dateRange">
        运行回测
      </button>
      <div id="signal-selector">
        <label><input type="checkbox" v-model="signals" value="TRENDBUY" checked> 趋势买底</label>
        <label><input type="checkbox" v-model="signals" value="BOTTOMBUY" checked> 底部买点</label>
        <label><input type="checkbox" v-model="signals" value="BOTTOMUPBUY" checked> 底部突破</label>
        <label><input type="checkbox" v-model="signals" value="TRENDSELL" checked> 趋势卖顶</label>
        <label><input type="checkbox" v-model="signals" value="STARK" checked> 希望之星</label>
        <label><input type="checkbox" v-model="signals" value="POTENTIALBUY" checked> 准备上</label>
        <label><input type="checkbox" v-model="signals" value="ENTRYBUY" checked> 出手</label>
        <label><input type="checkbox" v-model="signals" value="STRONGBUY" checked> 强势</label>
        <label><input type="checkbox" v-model="signals" value="STAGESELL" checked> 阶段卖出</label>
        <label><input type="checkbox" v-model="signals" value="CLEANSELL" checked> 清仓卖出</label>
      </div>
    </div>
    <div ref="chart" id="kline-chart"></div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import api from '../services/api'

export default {
  name: 'Stocks',
  components: {
    VueDatePicker
  },
  data() {
    return {
      stockCode: '',
      dateRange: null,
      signals: ['TRENDBUY', 'BOTTOMBUY', 'BOTTOMUPBUY', 'TRENDSELL', 'STARK', 'POTENTIALBUY', 'ENTRYBUY', 'STRONGBUY', 'STAGESELL', 'CLEANSELL'],
      chart: null,
      loading: false,
      error: '',
      locale: 'zh-CN',
      buyScoreThreshold: 5  // Buy when buy_score >= 5
    }
  },
  mounted() {
    this.chart = echarts.init(this.$refs.chart)
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    if (this.chart) {
      this.chart.dispose()
    }
  },
  methods: {
    handleResize() {
      if (this.chart) {
        this.chart.resize()
      }
    },
    async loadStockData() {
      if (!this.stockCode.trim()) {
        this.error = '请输入股票代码'
        return
      }

      this.loading = true
      this.error = ''
      try {
        let apiUrl = `/api/stocks/${this.stockCode.trim()}`
        const params = []
        if (this.dateRange && this.dateRange[0]) {
          const startDate = this.formatDate(this.dateRange[0])
          params.push(`start_date=${startDate}`)
        }
        if (this.dateRange && this.dateRange[1]) {
          const endDate = this.formatDate(this.dateRange[1])
          params.push(`end_date=${endDate}`)
        }
        if (params.length > 0) apiUrl += `?${params.join('&')}`

        const response = await api.get(apiUrl)
        const data = response.data

        if (data && data.data && data.data.length > 0) {
          this.renderKlineChart(data.data)
        } else {
          this.chart.clear()
          this.error = '未找到该股票的数据'
        }
      } catch (error) {
        this.chart.clear()
        this.error = error.response?.data?.detail || '获取股票数据失败'
        console.error('获取股票数据失败:', error)
      } finally {
        this.loading = false
      }
    },
    goToBacktest() {
      if (!this.stockCode || !this.dateRange) return
      const startDate = this.formatDate(this.dateRange[0])
      const endDate = this.formatDate(this.dateRange[1])
      this.$router.push({
        path: '/backtest',
        query: {
          stockCode: this.stockCode.trim(),
          startDate,
          endDate
        }
      })
    },
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    },
    renderKlineChart(stockData) {
      const klineData = stockData.map(item => [
        parseFloat(item.open),
        parseFloat(item.close),
        parseFloat(item.low),
        parseFloat(item.high)
      ])

      const dates = stockData.map(item => item.date)
      const volumes = stockData.map(item => parseFloat(item.volume))

      // Simulate trading strategy based on buy_score
      let position = 0  // 0 = holding cash, 1 = holding shares
      const holdingStatus = stockData.map(item => {
        const buyScore = parseFloat(item.buy_score)
        if (buyScore >= this.buyScoreThreshold && position === 0) {
          position = 1  // Buy: Start holding shares
        } else if (buyScore === 0 && position === 1) {
          position = 0  // Sell: Back to holding cash
        }
        return position
      })

      // Color volume bars: red when holding shares, green when holding cash
      const volumeColors = holdingStatus.map(status => status === 1 ? '#ec0000' : '#00da3c')

      const markers = []
      stockData.forEach(item => {
        const dateIndex = dates.indexOf(item.date)
        this.signals.forEach(signal => {
          if (item[signal]) {
            const isBuySignal = ['TRENDBUY', 'BOTTOMBUY', 'BOTTOMUPBUY', 'STARK', 'POTENTIALBUY', 'ENTRYBUY', 'STRONGBUY'].includes(signal)
            const yValue = isBuySignal ? parseFloat(item.low) : parseFloat(item.high)

            markers.push({
              name: signal,
              coord: [dateIndex, yValue],
              symbol: 'arrow',
              symbolSize: 12,
              symbolRotate: isBuySignal ? 0 : -180,
              itemStyle: { color: isBuySignal ? 'red' : 'green' },
              label: { show: false },
              tooltip: { value: signal }
            })
          }
        })
      })

      const option = {
        animation: false,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          formatter: function (params) {
            const date = params[0].axisValue
            const data = stockData[params[0].dataIndex]
            let html = `<div style="font-weight:bold">${date}</div>`
            html += `开盘: ${data.open}<br>`
            html += `收盘: ${data.close}<br>`
            html += `最高: ${data.high}<br>`
            html += `最低: ${data.low}<br>`
            html += `成交量: ${data.volume}<br>`
            html += `Buy Score: ${data.buy_score}<br>`
            html += `持仓状态: ${holdingStatus[params[0].dataIndex] === 1 ? '持股' : '持币'}<br>`

            const activeSignals = this.signals.filter(signal => data[signal])
            if (activeSignals.length > 0) {
              html += `<br>信号: ${activeSignals.join(', ')}`
            }

            return html
          }.bind(this)
        },
        axisPointer: {
          link: { xAxisIndex: 'all' },
          label: { backgroundColor: '#777' }
        },
        grid: [
          { left: '10%', right: '10%', top: '10%', height: '50%' },
          { left: '10%', right: '10%', top: '70%', height: '15%' }
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
            max: 'dataMax',
            axisPointer: { z: 100 }
          },
          {
            type: 'category',
            gridIndex: 1,
            data: dates,
            scale: true,
            boundaryGap: false,
            axisLine: { onZero: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            splitNumber: 20,
            min: 'dataMin',
            max: 'dataMax'
          }
        ],
        yAxis: [
          {
            scale: true,
            splitArea: { show: true }
          },
          {
            scale: true,
            gridIndex: 1,
            splitNumber: 2,
            axisLabel: { show: false },
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false }
          }
        ],
        dataZoom: [
          {
            type: 'inside',
            xAxisIndex: [0, 1],
            start: 0,
            end: 100
          },
          {
            show: true,
            xAxisIndex: [0, 1],
            type: 'slider',
            top: '90%',
            start: 0,
            end: 100
          }
        ],
        series: [
          {
            name: 'K线图',
            type: 'candlestick',
            data: klineData,
            itemStyle: {
              color: '#ec0000',
              color0: '#00da3c',
              borderColor: '#8a0000',
              borderColor0: '#008F28'
            },
            markPoint: { data: markers }
          },
          {
            name: '成交量',
            type: 'bar',
            xAxisIndex: 1,
            yAxisIndex: 1,
            data: volumes,
            itemStyle: {
              color: function(params) {
                return volumeColors[params.dataIndex]
              }
            }
          }
        ]
      }

      this.chart.setOption(option)
    }
  }
}
</script>

<style scoped>
.stocks {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

#search-container {
  margin-bottom: 10px;
}

#search-container input,
#search-container .date-picker {
  padding: 8px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  vertical-align: middle;
}

#search-container .date-picker {
  display: inline-block;
  width: 200px;
}

#search-container button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

#search-container button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

#signal-selector {
  margin-top: 10px;
  font-size: 14px;
}

#signal-selector label {
  margin-right: 10px;
}

#kline-chart {
  width: 100%;
  height: 400px;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>