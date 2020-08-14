<script>
  import Item from "./Item.svelte";

  let items = [
    {
      id: "0001",
      text: "Add delete item functionality",
      isComplete: false
    },
    {
      id: "0002",
      text: "Order item by complete ones first",
      isComplete: false
    },
    {
      id: "0003",
      text: "add movable functionality",
      isComplete: false
    },
    {
      id: "0003",
      text: "add movable functionality",
      isComplete: false
    }
  ];
</script>

<section class="section">
  <div class="container">
    {#each items as item, i}
      <Item {...item} />
    {/each}
  </div>
</section>
