<script>
  $: hidden = true;

  function testFunction() {
    console.log(this);
    hidden = !hidden;

    console.log(hidden);
  }
</script>

<style>
  .hidden {
    display: none;
  }

  .blue {
    color: blue;
  }
</style>

<span>

  <button on:mouseenter={testFunction} on:mouseleave={testFunction} />
  <div class:hidden={hidden === true}>now you see me</div>

</span>
