import type {
    LionWebJsonChunk, LionWebJsonProperty, LionWebJsonReference,
    LionWebJsonReferenceTarget, LionWebJsonContainment, LionWebJsonNode, LionWebJsonUsedLanguage
} from "@lionweb/json";
import type { PBBulkImport } from "./BulkImport";
import type { PBChunk } from "./Chunk";

export function convertPBChunkToJsonChunk(pbChunk: PBChunk) : LionWebJsonChunk {
    const { internedStrings:preInternedStrings, internedLanguages, internedMetaPointers, nodes } = pbChunk

    const internedStrings : (string|null)[] = new Array(preInternedStrings.length + 1)
    internedStrings[0] = null
    for (let i = 0; i < preInternedStrings.length; i++) {
        internedStrings[i+1] = preInternedStrings[i]
    }

    // Pre-compute all language mappings
    const languagesArray : (LionWebJsonUsedLanguage|null)[] = new Array(internedLanguages.length + 1)
    languagesArray[0] = null
    for (let i = 0; i < internedLanguages.length; i++) {
        const pbLanguage = internedLanguages[i]
        languagesArray[i+1] = {
            key: pbLanguage.siKey == undefined ? undefined : internedStrings[pbLanguage.siKey],
            version: pbLanguage.siVersion == undefined ? undefined : internedStrings[pbLanguage.siVersion]
        } as LionWebJsonUsedLanguage
    }

    // Pre-compute all metapointer mappings using arrays instead of Map
    const metaPointersArray = new Array(internedMetaPointers.length)
    for (let i = 0; i < internedMetaPointers.length; i++) {
        const pbMetaPointer = internedMetaPointers[i]
        const languageVersion = languagesArray[pbMetaPointer.liLanguage]
        metaPointersArray[i] = {
            language: languageVersion == undefined ? null : languageVersion.key,
            version: languageVersion == undefined ? null : languageVersion.version,
            key: pbMetaPointer.siKey == undefined ? undefined : internedStrings[pbMetaPointer.siKey]
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
    const convertedNodes : LionWebJsonNode[] = new Array(nodes.length)
    for (let i = 0; i < nodes.length; i++) {
        const pbNode = nodes[i]
        const { properties, containments, references } = pbNode

        // Pre-allocate nested arrays
        const convertedProperties : LionWebJsonProperty[] = new Array(properties.length)
        const convertedContainments : LionWebJsonContainment[] = new Array(containments.length)
        const convertedReferences : LionWebJsonReference[] = new Array(references.length)

        // Convert properties
        for (let j = 0; j < properties.length; j++) {
            const p = properties[j]
            convertedProperties[j] = {
                property: metaPointersArray[p.mpiMetaPointer],
                value: p.siValue == undefined ? null : internedStrings[p.siValue]
            }
        }

        // Convert containments
        for (let j = 0; j < containments.length; j++) {
            const c = containments[j]
            const convertedChildren = new Array(c.siChildren.length)
            for (let k = 0; k < c.siChildren.length; k++) {
                convertedChildren[k] = internedStrings[c.siChildren[k]]
            }
            convertedContainments[j] = {
                containment: metaPointersArray[c.mpiMetaPointer],
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
                    reference: rv.siReferred == undefined ? null : internedStrings[rv.siReferred],
                    resolveInfo: rv.siResolveInfo == undefined ? null : internedStrings[rv.siResolveInfo]
                }
            }
            convertedReferences[j] = {
                reference: metaPointersArray[r.mpiMetaPointer],
                targets: convertedTargets
            }
        }

        const convertedAnnotations = new Array(pbNode.siAnnotations.length)
        for (let j = 0; j < convertedAnnotations.length; j++) {
            convertedAnnotations[j] = internedStrings[pbNode.siAnnotations[j]]
        }

        convertedNodes[i] = {
            id: pbNode.siId == undefined ? null : internedStrings[pbNode.siId],
            parent: pbNode.siParent == undefined ? null : internedStrings[pbNode.siParent],
            classifier: metaPointersArray[pbNode.mpiClassifier],
            annotations: convertedAnnotations,
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