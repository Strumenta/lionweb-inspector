<script lang="ts">
    import type { LionWebJsonChunk, LionWebJsonNode } from "@lionweb/json";
    import { convertPBChunkToJsonChunk } from "$lib/proto/importlogic";
    import type { PBChunk } from "$lib/proto";
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { ChevronRight, ChevronDown, TreePine, FileText, Target, Layers, Eye } from '@lucide/svelte';

    let { pbChunk }: { pbChunk: PBChunk } = $props();

    const jsonChunk: LionWebJsonChunk = convertPBChunkToJsonChunk(pbChunk);
    const nodesByID = new Map<string, LionWebJsonNode>();
    jsonChunk.nodes.forEach(node => {
        nodesByID.set(node.id, node);
    });
    const roots = jsonChunk.nodes.filter(node => node.parent === undefined);
    
    let expandedNodes = $state(new Set<string>());
    let selectedTree = $state<number | null>(0); // First tree selected by default

    function toggleNode(nodeId: string) {
        if (expandedNodes.has(nodeId)) {
            expandedNodes.delete(nodeId);
        } else {
            expandedNodes.add(nodeId);
        }
        expandedNodes = new Set(expandedNodes); // Trigger reactivity
    }

    function getChildren(node: LionWebJsonNode): LionWebJsonNode[] {
        const children: LionWebJsonNode[] = [];
        node.containments.forEach(containment => {
            containment.children.forEach(childId => {
                const child = nodesByID.get(childId);
                if (child) {
                    children.push(child);
                }
            });
        });
        return children;
    }

    function getChildrenWithContainment(node: LionWebJsonNode): Array<{ child: LionWebJsonNode; containment: any }> {
        const childrenWithContainment: Array<{ child: LionWebJsonNode; containment: any }> = [];
        node.containments.forEach(containment => {
            containment.children.forEach(childId => {
                const child = nodesByID.get(childId);
                if (child) {
                    childrenWithContainment.push({ child, containment });
                }
            });
        });
        return childrenWithContainment;
    }

    function getNodeDisplayName(node: LionWebJsonNode): string {
        // Try to find a name property
        const nameProperty = node.properties.find(prop => 
            prop.property.key === 'name' || 
            prop.property.key === 'Name' ||
            prop.property.key === 'id'
        );
        return nameProperty?.value || node.id || 'Unnamed Node';
    }

    function renderTreeNode(node: LionWebJsonNode, depth: number = 0) {
        const children = getChildren(node);
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = children.length > 0;
        const displayName = getNodeDisplayName(node);
        
        return {
            node,
            children,
            isExpanded,
            hasChildren,
            displayName,
            depth
        };
    }

    function formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
</script>

<div class="space-y-4">
    <div class="flex items-center justify-between">
        <div></div> <!-- necessary for the layout-->
        <div class="text-sm text-gray-500 dark:text-gray-400">
            {roots.length} root{roots.length !== 1 ? 's' : ''} found
        </div>
    </div>

    {#if roots.length === 0}
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
            <TreePine class="h-12 w-12 mx-auto mb-4" />
            <p>No root nodes found in this chunk</p>
        </div>
    {:else if roots.length === 1}
        <!-- Single tree - show directly -->
        <div class="space-y-2">
            <!-- <h5 class="font-medium text-sm text-gray-700 dark:text-gray-300">Tree Structure</h5> -->
            <div class="/*border border-gray-200*/ dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                {@render TreeNode(renderTreeNode(roots[0]))}
            </div>
        </div>
    {:else}
        <!-- Multiple trees - compact horizontal switcher -->
        <div class="space-y-4">
            <div class="flex items-center gap-2">
                <Layers class="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Trees:</span>
            </div>
            
            <div class="flex flex-wrap gap-2">
                {#each roots as root, index}
                    <button
                        class={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedTree === index 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        onclick={() => selectedTree = index}
                    >
                        <TreePine class="h-4 w-4" />
                        <span class="truncate max-w-32">{getNodeDisplayName(root)}</span>
                        {#if selectedTree === index}
                            <div class="w-2 h-2 bg-white rounded-full"></div>
                        {/if}
                    </button>
                {/each}
            </div>

            {#if selectedTree !== null}
                <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900 overflow-x-auto">
                    {@render TreeNode(renderTreeNode(roots[selectedTree]))}
                </div>
            {/if}
        </div>
    {/if}
</div>

<!-- TreeNode Component -->
{#snippet TreeNode(data)}
    <div class="select-none">
        <!-- Node Container with Properties and References -->
        <div class="border border-black dark:border-white rounded-lg mb-2 bg-white dark:bg-gray-800" style="background-color: ivory;">
            <div 
                class="flex items-center gap-2 py-2 px-3 rounded-t-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                style="padding-left: {data.depth * 12 + 12}px"
                role="button"
                tabindex="0"
                onclick={() => data.hasChildren && toggleNode(data.node.id)}
                onkeydown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && data.hasChildren) {
                        e.preventDefault();
                        toggleNode(data.node.id);
                    }
                }}
            >
                {#if data.hasChildren}
                    {#if data.isExpanded}
                        <ChevronDown class="h-4 w-4 text-gray-500" />
                    {:else}
                        <ChevronRight class="h-4 w-4 text-gray-500" />
                    {/if}
                {:else}
                    <div class="w-4 h-4"></div>
                {/if}
                
                <FileText class="h-4 w-4 text-gray-400" />
                <span class="text-sm font-medium">{data.displayName}</span>
                <span class="text-xs text-gray-500">
                    ({data.node.classifier.key})
                </span>
                <!-- <div class="ml-auto flex items-center gap-2">
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {data.node.type === 'json' ? 'JSON' : 'Protobuffer'}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(data.node.size)}
                    </span>
                </div> -->
            </div>

            {#if data.node.properties.length > 0}
                <div class="border-t border-gray-200 dark:border-gray-700 rounded-b-lg p-3">
                    <div class="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Properties:</div>
                    <div class="space-y-3">
                         {#each data.node.properties as property}
                             <div class="flex gap-3">
                                 <!-- Property Key Column (Fixed width for alignment) -->
                                 <div class="w-32 flex-shrink-0">
                                     <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                         {property.property.key}
                                     </span>
                                 </div>
                                 
                                 <!-- Property Value Column -->
                                 <div class="flex-1 min-w-0">
                                     {#if property.value}
                                         <div class="text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded whitespace-pre-wrap break-words text-left">
                                             {property.value}
                                         </div>
                                     {:else}
                                         <span class="text-gray-400 italic text-left block">No value</span>
                                     {/if}
                                 </div>
                             </div>
                         {/each}
                    </div>
                </div>
            {/if}
        
            {#if data.node.references.length > 0}
                <div class="border-t border-gray-200 dark:border-gray-700 rounded-b-lg p-3">
                    <div class="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">References:</div>
                    <div class="space-y-3">
                        {#each data.node.references as reference}
                            <div class="flex gap-3">
                                <!-- Reference Key Column (Tag-like) -->
                                <div class="flex-shrink-0">
                                    <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {reference.reference.key}
                                    </span>
                                </div>
                                
                                <!-- Targets Column -->
                                <div class="flex-1 min-w-0">
                                    {#if reference.targets.length > 0}
                                        <div class="space-y-1">
                                            {#each reference.targets as target}
                                                <div class="flex items-center gap-2 text-xs">
                                                    {#if target.resolveInfo}
                                                        <span class="text-gray-700 dark:text-gray-300 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                            {target.resolveInfo}
                                                        </span>
                                                        {#if target.reference}
                                                            <span class="text-gray-400">→</span>
                                                            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                                <Target class="h-3 w-3" />
                                                                {target.reference}
                                                            </span>
                                                        {:else}
                                                            <span class="text-gray-400 italic">Not resolved</span>
                                                        {/if}
                                                    {:else if target.reference}
                                                        <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                            <Target class="h-3 w-3" />
                                                            {target.reference}
                                                        </span>
                                                    {:else}
                                                        <span class="text-gray-400 italic">No target info</span>
                                                    {/if}
                                                </div>
                                            {/each}
                                        </div>
                                    {:else}
                                        <div class="text-xs text-gray-400 italic">No targets</div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>
        
        <!-- Annotations Container (Outside the bordered container, only when expanded) -->
        {#if data.isExpanded && data.node.annotations.length > 0}
            <div class="relative" style="margin-left: {data.depth * 12 + 16}px;">
                <div class="mb-4">
                    <div class="text-xs text-gray-600 dark:text-gray-400 mb-1 font-medium">Annotations:</div>
                    <div class="space-y-1">
                        {#each data.node.annotations as annotationId}
                            <div class="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded px-2 py-1">
                                <span class="text-xs font-mono text-yellow-800 dark:text-yellow-200">
                                    {annotationId}
                                </span>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}

        <!-- Children Container (Outside the bordered container) -->
        {#if data.isExpanded && data.hasChildren}
            <div class="relative" style="margin-left: {data.depth * 12 + 16}px;">
                <!-- Connecting Line -->
                <div class="absolute left-0 top-0 w-px h-full bg-gray-300 dark:bg-gray-600"></div>
                
                {#each getChildrenWithContainment(data.node) as childWithContainment}
                    <div class="relative mb-4">
                        <!-- Horizontal connecting line -->
                        <div class="absolute left-0 top-6 w-4 h-px bg-gray-300 dark:bg-gray-600"></div>
                        
                        <!-- Containment metapointer display -->
                        <div class="text-xs text-gray-500 dark:text-gray-400 mb-2 ml-6">
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                {childWithContainment.containment.containment.key}
                            </span>
                        </div>
                        
                        <!-- Child node -->
                        <div class="ml-6">
                            {@render TreeNode(renderTreeNode(childWithContainment.child, data.depth + 1))}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
{/snippet}