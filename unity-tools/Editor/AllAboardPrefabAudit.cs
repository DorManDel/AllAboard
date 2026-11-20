// All Aboard Mechanics Lab — proposed Unity Editor tooling (NOT imported into game).
// Place in Assets/Editor/AllAboardPrefabAudit.cs only after review.
// This script has no runtime dependencies. It does not modify assets.
#if UNITY_EDITOR
using System;
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;

public static class AllAboardPrefabAudit
{
    private static int _errors;
    private static int _prefabs;
    private static readonly List<string> Findings = new List<string>();

    [MenuItem("Tools/All Aboard/Audit All Prefabs")]
    public static void AuditAllPrefabs()
    {
        _errors = 0;
        _prefabs = 0;
        Findings.Clear();

        string[] guids = AssetDatabase.FindAssets("t:Prefab", new[] { "Assets" });
        foreach (string guid in guids)
        {
            string path = AssetDatabase.GUIDToAssetPath(guid);
            GameObject root = null;
            try
            {
                root = PrefabUtility.LoadPrefabContents(path);
                _prefabs++;

                foreach (Transform transform in root.GetComponentsInChildren<Transform>(true))
                {
                    Component[] components = transform.GetComponents<Component>();
                    foreach (Component component in components)
                    {
                        if (component != null)
                        {
                            continue;
                        }

                        _errors++;
                        Findings.Add($"Missing component: {path} · {GetHierarchyPath(transform)}");
                    }

                    // A zero-scale GameObject can accidentally hide interactive/UI objects.
                    // This is a warning, not an error, since some assets do this intentionally.
                    Vector3 scale = transform.localScale;
                    if (Mathf.Approximately(scale.x, 0f)
                        && Mathf.Approximately(scale.y, 0f)
                        && Mathf.Approximately(scale.z, 0f))
                    {
                        Findings.Add($"Warning: zero scale · {path} · {GetHierarchyPath(transform)}");
                    }
                }
            }
            catch (Exception exception)
            {
                _errors++;
                Findings.Add($"Cannot inspect {path}: {exception.Message}");
            }
            finally
            {
                if (root != null)
                {
                    PrefabUtility.UnloadPrefabContents(root);
                }
            }
        }

        foreach (string finding in Findings)
        {
            if (finding.StartsWith("Warning:", StringComparison.Ordinal))
            {
                Debug.LogWarning("[AllAboard Audit] " + finding);
            }
            else
            {
                Debug.LogError("[AllAboard Audit] " + finding);
            }
        }

        Debug.Log($"[AllAboard Audit] Inspected {_prefabs} prefabs. Errors: {_errors}.");

        if (Application.isBatchMode && _errors > 0)
        {
            EditorApplication.Exit(1);
        }
    }

    private static string GetHierarchyPath(Transform item)
    {
        string path = item.name;
        while (item.parent != null)
        {
            item = item.parent;
            path = item.name + "/" + path;
        }
        return path;
    }
}
#endif
