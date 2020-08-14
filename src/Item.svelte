<script>
  //Library

  //Data
    import { _deleteItem } from "./store.js";


  //Comonents

  //variables
  export let isComplete = false;
  export let text = "";
  export let id = "0001";

  let placeholder = "Describe the step...";
  let hidden = true;

  $: console.log(isComplete);

  //Visual
  function toggleHidden() {
    hidden = !hidden;
  }

  //Logic
  function deleteItem() {
    _deleteItem(this.parentElement.id)
  }
</script>

<style>
  input[type="text"] {
    border: none;
    width: 30%;
  }

  button {
    background:none;
    border: none;
  }

  .hidden {
    visibility: hidden;
  }
  .complete {
    text-decoration: line-through;
    color: grey;
  }
</style>

<div
  class="task"
  {id}
  on:mouseenter={toggleHidden}
  on:mouseleave={toggleHidden}>
  <input type="checkbox" class:hidden bind:checked={isComplete} />
  <input type="text" {placeholder} value={text} class:complete={isComplete} />
  <button class:hidden on:click={deleteItem}>🗑</button>
</div>
