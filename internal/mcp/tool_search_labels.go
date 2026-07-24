package mcp

import (
	"encoding/json"
	"fmt"

	"morning-glory/internal/models"
)

func (h *Handlers) registerSearchLabels(r *ToolRegistry) {
	r.Register(&ToolDefinition{
		Name:        "search_labels",
		Description: "Search labels by project. Use this to find label IDs needed for creating issues with labels. Returns label id, name, color, and capability.",
		InputSchema: ObjectSchema(map[string]interface{}{
			"projectId": StringParam("Project ID (required if agent is member of multiple projects)"),
			"group":     StringParam("Filter by label group, e.g. type, priority, lang"),
		}, nil),
		Handler: h.handleSearchLabels,
	})
}

func (h *Handlers) handleSearchLabels(id json.RawMessage, params json.RawMessage, agentID uint, remoteAddr string) Response {
	var p struct {
		ProjectID string `json:"projectId"`
		Group     string `json:"group"`
	}
	if err := json.Unmarshal(params, &p); err != nil {
		return NewError(id, -32602, "Invalid params: "+err.Error())
	}
	if agentID == 0 {
		return NewError(id, -32602, "Not authenticated")
	}
	projectID, err := h.resolveProject(p.ProjectID, agentID)
	if err != nil {
		return NewError(id, -32602, err.Error())
	}
	labels, err := h.projectSvc.ListLabels(projectID, p.Group)
	if err != nil {
		return NewInternalError(id, err.Error())
	}
	items := make([]map[string]interface{}, len(labels))
	for i, lb := range labels {
		items[i] = map[string]interface{}{
			"id":         fmt.Sprintf("%d", lb.ID),
			"name":       lb.Name,
			"color":      lb.Color,
			"capability": labelCap(lb.Capability),
			"group":      lb.Group,
			"description": func() string {
				if lb.Description != "" {
					return lb.Description
				}
				desc := labelDesc(lb.Name)
				if desc != "" {
					return desc
				}
				return lb.Name
			}(),
		}
	}
	if items == nil {
		items = []map[string]interface{}{}
	}
	return NewResponse(id, map[string]interface{}{
		"labels": items,
	})
}

func labelCap(cap models.CapabilityType) string {
	if cap == "" {
		return ""
	}
	return string(cap)
}

func labelDesc(name string) string {
	descs := map[string]string{
		"frontend": "前端相关任务",
		"backend":  "后端相关任务",
		"bug":      "Bug 修复",
		"feature":  "新功能开发",
		"docs":     "文档相关",
		"test":     "测试相关",
		"devops":   "基础设施/DevOps",
		"design":   "UI/UX 设计",
	}
	if d, ok := descs[name]; ok {
		return d
	}
	return ""
}
