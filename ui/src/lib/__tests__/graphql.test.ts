import { gql } from "@/lib/graphql";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  localStorage.clear();
});

describe("gql", () => {
  it("sends POST request to /graphql", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ data: { hello: "world" } }),
    });

    const result = await gql("query { hello }");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe("/graphql");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({
      query: "query { hello }",
    });
    expect(result).toEqual({ data: { hello: "world" } });
  });

  it("includes Authorization header when token exists", async () => {
    localStorage.setItem("token", "test-token-123");
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    });

    await gql("query { x }");

    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.headers["Authorization"]).toBe("Bearer test-token-123");
  });

  it("sends operationName when query has named operation", async () => {
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    });

    await gql("mutation CreateUser($name: String!) { createUser(name: $name) }", { name: "test" });

    const [, opts] = fetchMock.mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.operationName).toBe("CreateUser");
    expect(body.variables).toEqual({ name: "test" });
  });

  it("redirects to /login on 401", async () => {
    delete (window as any).location;
    window.location = { href: "" } as any;
    fetchMock.mockResolvedValueOnce({ status: 401 });

    const result = await gql("query { secret }");

    expect(result).toEqual({});
    expect(window.location.href).toBe("/login");
  });

  it("redirects to /login on UNAUTHENTICATED error", async () => {
    delete (window as any).location;
    window.location = { href: "" } as any;
    fetchMock.mockResolvedValueOnce({
      status: 200,
      json: () =>
        Promise.resolve({
          errors: [{ message: "UNAUTHENTICATED" }],
        }),
    });

    const result = await gql("query { secret }");

    expect(result).toEqual({});
    expect(window.location.href).toBe("/login");
  });
});
