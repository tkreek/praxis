<script>
  import {_state, _addItem } from "./store.js";

  export let name

  function addItem() {
    _addItem($_state.blockID)
  }
</script>

<style>
  button {
    font-size: 0.6em;
    border: none;
    background: none;
    margin-left: 1em;
    color: #3366cc;
  }
</style>

<h1 class="title is-4">
  {name}
  <button on:click={addItem}>New Item +</button>
</h1>
