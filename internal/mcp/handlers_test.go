package mcp_test

import (
	"encoding/json"
	"testing"

	"chick/internal/mcp"
	"chick/internal/models"
)

func TestAssignIssue(t *testing.T) {
	srv, projectSvc, agentSvc, _ := setupTest(t)

	agent, err := agentSvc.Register("assign-agent", "ai", "assign-001", "pass", nil, "", "")
	if err != nil {
		t.Fatalf("register: %v", err)
	}

	proj, _ := projectSvc.Create("AssignTest", "")
	projectSvc.AddMember(proj.ID, agent.ID, models.ProjectRoleMember)

	agentSvc.Register("target-agent", "ai", "assign-002", "pass", nil, "", "")

	result := call(t, srv, "tools/call", map[string]interface{}{
		"name": "create_issue",
		"arguments": map[string]interface{}{
			"title": "Assignable",
		},
	}, agent.ID)
	issueID := result["id"].(string)

	result = call(t, srv, "tools/call", map[string]interface{}{
		"name": "assign_issue",
		"arguments": map[string]interface{}{
			"issueId": issueID,
			"agentId": "1",
		},
	}, agent.ID)
	if result["success"] != true {
		t.Errorf("expected assign to succeed, got %v", result)
	}
}

func TestJSONRPCBasic(t *testing.T) {
	srv, _, _, _ := setupTest(t)

	req := &mcp.Request{
		JSONRPC: "2.0",
		ID:      json.RawMessage(`1`),
		Method:  "ping",
	}
	resp := srv.HandleRequest(req, 0, "")
	if resp.Error != nil {
		t.Fatalf("unexpected ping error: %s", resp.Error.Message)
	}

	req2 := &mcp.Request{
		JSONRPC: "2.0",
		ID:      json.RawMessage(`2`),
		Method:  "invalid_method",
	}
	resp2 := srv.HandleRequest(req2, 0, "")
	if resp2.Error == nil {
		t.Fatal("expected error for invalid method")
	}
}
