export default `
<script>
  import { onMount } from 'svelte'
  let ctx
  let pixels = []
  let canvas
  let animationFrameId

  function Color(h, s, l, a) {
    this.h = h
    this.s = s
    this.l = l
    this.a = a

    this.dir = Math.random() > 0.5 ? -1 : 1

    this.toString = function () {
      return (
        'hsla(' + this.h + ', ' + this.s + '%, ' + this.l + '%, ' + this.a + ')'
      )
    }
  }

  function Pixel(x, y, w, h, color) {
    this.x = {
      c: x,
      min: 0,
      max: canvas.width,
      dir: Math.random() > 0.5 ? -1 : 1,
    }

    this.y = {
      c: y,
      min: 0,
      max: canvas.height,
      dir: Math.random() > 0.5 ? -1 : 1,
    }

    this.w = {
      c: w,
      min: 2,
      max: canvas.width,
      dir: Math.random() > 0.5 ? -1 : 1,
    }

    this.h = {
      c: h,
      min: 2,
      max: canvas.height,
      dir: Math.random() > 0.5 ? -1 : 1,
    }

    this.color = color

    this.direction = Math.random() > 0.1 ? -1 : 1

    this.velocity = (Math.random() * 100 + 100) * 0.01 * this.direction
  }

  function updatePixel(pixel) {
    if (pixel.x.c <= pixel.x.min || pixel.x.c >= pixel.x.max) {
      pixel.x.dir *= -1
    }

    if (pixel.y.c <= pixel.y.min || pixel.y.c >= pixel.y.max) {
      pixel.y.dir *= -1
    }

    if (pixel.w.c <= pixel.w.min || pixel.w.c >= pixel.w.max) {
      pixel.w.dir *= -1
    }

    if (pixel.h.c <= pixel.h.min || pixel.h.c >= pixel.h.max) {
      pixel.h.dir *= -1
    }

    if (pixel.color.a <= 0 || pixel.color.a >= 0.75) {
      pixel.color.dir *= -1
    }

    pixel.x.c += 0.005 * pixel.x.dir
    pixel.y.c += 0.005 * pixel.y.dir

    pixel.w.c += 0.005 * pixel.w.dir
    pixel.h.c += 0.005 * pixel.h.dir
  }

  function renderPixel(pixel) {
    ctx.restore()

    ctx.fillStyle = pixel.color.toString()
    ctx.fillRect(pixel.x.c, pixel.y.c, pixel.w.c, pixel.h.c)
  }

  function paint() {
    if (canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = 0; i < pixels.length; i++) {
        updatePixel(pixels[i])

        renderPixel(pixels[i])
      }
    }
  }

  function animate() {
    paint()
    animationFrameId = window.requestAnimationFrame(animate)
  }

  onMount(() => {
    canvas = document.querySelector('.background-gradients')
    ctx = canvas.getContext('2d')
    ctx.save()

    pixels = [
      new Pixel(1, 1, 3, 4, new Color(252, 70, 67, 0.8)),
      new Pixel(0, 0, 1, 1, new Color(0, 0, 98, 1)),
      new Pixel(0, 3, 2, 2, new Color(11, 100, 62, 0.8)),
      new Pixel(4, 0, 4, 3, new Color(190, 94, 75, 0.8)),
      new Pixel(3, 1, 1, 2, new Color(324, 98, 50, 0.1)),
    ]

    animate()
    return () => window.cancelAnimationFrame(animationFrameId)
  })
</script>

<style>
  @import '../styles/Home.module.css';
</style>

<div class="background">
  <canvas class="background-gradients" width="6" height="6" />
</div>
<div class="container">
  <slot />
</div>
`;
