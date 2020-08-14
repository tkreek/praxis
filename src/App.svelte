<script>
  //data
  import {_items} from './store.js'

  import Item from "./Item.svelte";

</script>

<section class="section">
  <div class="container">
    {#each $_items as item, i}
      <Item {...item} />
    {/each}
  </div>
</section>
