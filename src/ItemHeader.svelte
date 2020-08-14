<script>
  import { _addItem } from "./store.js";

  function addItem() {
    _addItem()
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
  Items
  <button on:click={addItem}>New Item +</button>
</h1>
