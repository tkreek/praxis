<script>
  //data
  import { afterUpdate } from 'svelte';
  import { _blocks, _state, _updateState} from "./store.js";

  //components
  import ItemHeader from "./ItemHeader.svelte";
  import Item from "./Item.svelte";
  import Pomodoro from "./Pomodoro.svelte";


  $: block = 0;
  $: currentID = $_blocks[block].id
  $: currentName = $_blocks[block].text;
  $: currentSteps = $_blocks[block].steps;
  $: currentBlock = $_state.blockID


afterUpdate(() => {
	  _updateState('blockID', currentID)
});


  function nextBlock() {
    if (block < $_blocks.length - 1) {
      block++;
    } else {
      alert("no more blocks");
    }
  }

  function prevBlock() {
    if (block > 0) {
      block--;
    } else {
      alert("no more blocks");
    }
  }
</script>

<section class="section">
  <div class="container">
    <button on:click={prevBlock}>Previous Block</button>
    <button on:click={nextBlock}>Next Block</button>
    <p>Current Block {currentID}</p>
    <ItemHeader name={currentName} />
    {#each currentSteps as item, i}
      <Item bind:isComplete={item.isComplete} bind:text={item.text}/>
    {/each}
    <Pomodoro />
  </div>
</section>

<Item/>
