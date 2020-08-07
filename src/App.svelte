<script>
  //Library

  //Data
  import { _items, _completedItems, _incompletedItems } from "./data/store.js";

  //Comonents
  import ItemList from "./components/ItemList.svelte";
  import Title from "./components/Title.svelte";
</script>

<style>

</style>

<section class="section">
  <div class="container">
    <Title />
  </div>
</section>

<section class="section">
  <div class="container">
    <h4 class="title is-4">ToDo</h4>
    <ItemList items={$_completedItems} />
    <h4 class="title is-4">Complete</h4>
    <ItemList items={$_incompletedItems} />

  </div>
</section>
