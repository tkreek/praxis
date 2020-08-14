<script>
  //data
  import {_items} from './store.js'

  import ItemHeader from './ItemHeader.svelte'
  import Item from "./Item.svelte";

</script>

<section class="section">
  <div class="container">
  <ItemHeader/>
    {#each $_items as item, i}
      <Item {...item} />
    {/each}
  </div>
</section>
