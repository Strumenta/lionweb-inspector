<script lang="ts">
    import type { LionWebJsonChunk } from "@lionweb/json";
    import { convertPBChunkToJsonChunk } from "$lib/proto/importlogic";

    let { pbChunk }: { pbChunk: PBChunk } = $props();

    const jsonChunk: LionWebJsonChunk = convertPBChunkToJsonChunk(pbChunk);
</script>

<div class="text-gray-500 dark:text-gray-400">
    <h4 class="text-lg font-medium mb-2">Chunk View</h4>
    <p>To be implemented ABC</p>
</div>