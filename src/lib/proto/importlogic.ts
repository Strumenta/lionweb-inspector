import type { LionWebJsonChunk, LionWebJsonReference, LionWebJsonReferenceTarget } from "@lionweb/json";
import type { PBBulkImport } from "./BulkImport";
import type { PBChunk } from "./Chunk";

export function convertPBChunkToJsonChunk(pbChunk: PBChunk) : LionWebJsonChunk {
    const { internedStrings, internedLanguages, internedMetaPointers, nodes } = pbChunk

    // Pre-compute all language mappings
    const languagesArray = new Array(internedLanguages.length)
    for (let i = 0; i < internedLanguages.length; i++) {
        const pbLanguage = internedLanguages[i]
        languagesArray[i] = {
            key: pbLanguage.key == undefined ? undefined : internedStrings[pbLanguage.key],
            version: pbLanguage.version == undefined ? undefined : internedStrings[pbLanguage.version]
        }
    }

    // Pre-compute all metapointer mappings using arrays instead of Map
    const metaPointersArray = new Array(internedMetaPointers.length)
    for (let i = 0; i < internedMetaPointers.length; i++) {
        const pbMetaPointer = internedMetaPointers[i]
        const languageVersion = languagesArray[pbMetaPointer.language]
        metaPointersArray[i] = {
            language: languageVersion.key,
            version: languageVersion.version,
            key: pbMetaPointer.key == undefined ? undefined : internedStrings[pbMetaPointer.key]
        }
    }

    // // Convert attach points with pre-allocated array
    // const convertedAttachPoints : Att= new Array(attachPoints.length)
    // for (let i = 0; i < attachPoints.length; i++) {
    //     const pbAttachPoint = attachPoints[i]
    //     convertedAttachPoints[i] = {
    //         container: internedStrings[pbAttachPoint.container],
    //         containment: metaPointersArray[pbAttachPoint.metaPointerIndex],
    //         root: internedStrings[pbAttachPoint.rootId]
    //     }
    // }

    // Convert nodes with pre-allocated array
    const convertedNodes = new Array(nodes.length)
    for (let i = 0; i < nodes.length; i++) {
        const pbNode = nodes[i]
        const { properties, containments, references } = pbNode

        // Pre-allocate nested arrays
        const convertedProperties = new Array(properties.length)
        const convertedContainments = new Array(containments.length)
        const convertedReferences = new Array(references.length)

        // Convert properties
        for (let j = 0; j < properties.length; j++) {
            const p = properties[j]
            convertedProperties[j] = {
                property: metaPointersArray[p.metaPointer],
                value: p.value == undefined ? undefined : internedStrings[p.value]
            }
        }

        // Convert containments
        for (let j = 0; j < containments.length; j++) {
            const c = containments[j]
            const convertedChildren = new Array(c.children.length)
            for (let k = 0; k < c.children.length; k++) {
                convertedChildren[k] = internedStrings[c.children[k]]
            }
            convertedContainments[j] = {
                containment: metaPointersArray[c.metaPointer],
                children: convertedChildren
            }
        }

        // Convert references
        for (let j = 0; j < references.length; j++) {
            const r = references[j]
            const convertedTargets : LionWebJsonReferenceTarget[] = new Array(r.values.length)
            for (let k = 0; k < r.values.length; k++) {
                const rv = r.values[k]
                convertedTargets[k] = {
                    referred: rv.referred == undefined || rv.referred == null ? null : internedStrings[rv.referred],
                    resolveInfo: rv.resolveInfo == undefined || rv.resolveInfo == null ? null : internedStrings[rv.resolveInfo]
                }
            }
            convertedReferences[j] = {
                reference: metaPointersArray[r.metaPointer],
                targets: convertedTargets
            }
        }

        convertedNodes[i] = {
            id: pbNode.id == undefined ? undefined : internedStrings[pbNode.id],
            parent: pbNode.parent == undefined ? undefined : internedStrings[pbNode.parent],
            classifier: metaPointersArray[pbNode.classifier],
            annotations: [], // Empty array as in original
            properties: convertedProperties,
            containments: convertedContainments,
            references: convertedReferences
        }
    }

    return {    
        serializationFormatVersion: pbChunk.serializationFormatVersion,
        languages: languagesArray,
        nodes: convertedNodes
    }
}