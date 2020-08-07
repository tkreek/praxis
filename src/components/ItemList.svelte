<script>
  import { _items } from "../data/store.js";

  import { flip } from "svelte/animate";
  import { dndzone } from "svelte-dnd-action";
  export let items;
  //   [
  //     { id: 1, isComplete: true, name: "This is item is TRUE" },
  //     { id: 2, isComplete: false, name: "This is very FALSE" },
  //     { id: 3, isComplete: true, name: "This is FALSE too" },
  //     { id: 4, isComplete: false, name: "This is TRUE too" }
  //   ];
  const flipDurationMs = 300;
  function handleDndConsider(e) {
    items = e.detail.items;
  }
  function handleDndFinalize(e) {
    items = e.detail.items;
  }

  function removeItem() {
    console.log("remove item was called");
    let id = this.parentElement.parentElement.id;
    _items.update(items => {
      items = items.filter(item => item.id !== id);
      return items;
    });
  }
</script>

<style>
  section {
    padding: 0.3em;
    /* this will allow the dragged element to scroll the list */
    overflow: scroll;
  }
  div {
    padding: 0.2em;
    margin: 0.15em 0;
  }

  button {
    border: none;
    background: none;
  }

  .completed {
    text-decoration: line-through;
  }
</style>

<section
  use:dndzone={{ items, flipDurationMs }}
  on:consider={handleDndConsider}
  on:finalize={handleDndFinalize}>
  {#each items as item (item.id)}
    <div animate:flip={{ duration: flipDurationMs }} id={item.id}>
      <span class:completed={item.isComplete !== true}>{item.text}</span>
      <span>
        <button>🖋</button>
      </span>
      <span>
        <button on:click={removeItem}>🗑</button>
      </span>
    </div>
  {/each}
</section>
