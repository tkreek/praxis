<script>
  import { step } from "./store.js";

  function addItem() {
    console.log(this);
    step.add();
  }

  export let stepTitle = "Placeholder title goes here";
  export let poms = 1

  $: console.log(poms)
</script>

<style>
  span {
    display: flex;
    align-items: center;
  }
  select {
    margin-left: 1em;
  }

  section {
    margin-bottom: 2em;
  }
</style>

<section>
  <h1 class="title is-4">{stepTitle}</h1>
  <span>
    <p>Estimated Time:</p>
    <div class="select">
      <select bind:value={poms}>
        <option value=1>🍅 X 1</option>
        <option value=2>🍅 X 2</option>
        <option value=3>🍅 X 3</option>
        <option value=4>🍅 X 4</option>
        <option value=5>🍅 X 5</option>
        <option value=6>🍅 X 6</option>
      </select>
    </div>
  </span>

  <button class="button" on:click={addItem}>New Item +</button>

</section>
