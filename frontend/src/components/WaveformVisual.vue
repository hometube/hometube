<script>
import { ref, onMounted, onUnmounted, watch } from 'vue'

export default {
  props: ['audioElement', 'playing'],
  setup(props) {
    const canvas = ref(null)
    let animFrameId = null
    let audioContext = null
    let analyser = null
    let dataArray = null
    let rotation = 0

    const initAnalyser = () => {
      if (!canvas.value || !props.audioElement) return
      canvas.value.width = canvas.value.offsetWidth
      canvas.value.height = canvas.value.offsetHeight
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        const source = audioContext.createMediaElementSource(props.audioElement)
        source.connect(analyser)
        analyser.connect(audioContext.destination)
        dataArray = new Uint8Array(analyser.frequencyBinCount)
      }
      drawWaveform()
    }

    const drawWaveform = () => {
      if (!analyser || !props.playing) {
        if (animFrameId) {
          cancelAnimationFrame(animFrameId)
          animFrameId = null
        }
        return
      }
      animFrameId = requestAnimationFrame(drawWaveform)
      analyser.getByteFrequencyData(dataArray)

      const ctx = canvas.value.getContext('2d')
      const w = canvas.value.width
      const h = canvas.value.height
      const cx = w / 2
      const cy = h / 2
      const maxRadius = (cx + cy) / 2
      const fullFill = Math.sqrt(cx * cx + cy * cy)

      ctx.clearRect(0, 0, w, h)

      const barCount = dataArray.length
      const angleStep = (Math.PI * 2) / barCount

      rotation += 0.01
      const avgIntensity = dataArray.reduce((a, b) => a + b, 0) / dataArray.length

      for (let i = 0; i < barCount; i++) {
        const value = (dataArray[i] + avgIntensity) / (255 * 2)
        const barHeight = value * maxRadius * 0.5
        const angle = i * angleStep + rotation

        const x1 = cx + Math.cos(angle) * (maxRadius - barHeight)
        const y1 = cy + Math.sin(angle) * (maxRadius - barHeight)
        const x2 = cx + Math.cos(angle) * fullFill
        const y2 = cy + Math.sin(angle) * fullFill

        const hue = (i / barCount * 60 + Date.now() / 50) % 360
        ctx.strokeStyle = `hsl(${hue}, 70%, ${30 + value * 30}%)`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
    }

    watch(() => props.playing, (newVal) => {
      if (newVal && props.audioElement) {
        if (audioContext && audioContext.state === 'suspended') audioContext.resume()
        initAnalyser()
      }
    })

    onMounted(() => {
      if (props.audioElement && props.playing) {
        setTimeout(() => initAnalyser(), 100)
      }
    })

    onUnmounted(() => {
      if (animFrameId) cancelAnimationFrame(animFrameId)
      if (audioContext) {
        audioContext.close()
        audioContext = null
      }
    })

    return { canvas }
  }
}
</script>

<template>
  <canvas ref="canvas" class="absolute inset-0 w-full h-full opacity-60 blur-xl"></canvas>
</template>
