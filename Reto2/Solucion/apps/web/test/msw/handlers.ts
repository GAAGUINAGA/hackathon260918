import { http, HttpResponse } from "msw";

export const contactFixture = {
  id: "11111111-1111-1111-1111-111111111111",
  displayName: "Ada Lovelace",
  company: "Analytical Engines",
  primaryEmail: "ada@example.com",
  primaryPhone: "+34600000000",
};

export const createdContactFixture = {
  id: "22222222-2222-2222-2222-222222222222",
  displayName: "Grace Hopper",
  company: null,
  primaryEmail: "grace@example.com",
  primaryPhone: null,
};

const API_BASE = "http://localhost:3000";
const SUPABASE_BASE = "https://test-project.supabase.co";

export const handlers = [
  http.get(`${API_BASE}/v1/contacts`, () => HttpResponse.json({ items: [contactFixture], nextCursor: null })),

  http.get(`${API_BASE}/v1/contacts/:id`, ({ params }) => {
    if (params.id === contactFixture.id) {
      return HttpResponse.json(contactFixture);
    }
    if (params.id === createdContactFixture.id) {
      return HttpResponse.json(createdContactFixture);
    }
    return HttpResponse.json({ code: "contact_not_found", message: "Contacto no encontrado." }, { status: 404 });
  }),

  http.post(`${API_BASE}/v1/contacts`, async ({ request }) => {
    const body = (await request.json()) as { displayName?: string };
    if (body.displayName === "__invalid__") {
      return HttpResponse.json(
        { code: "invalid_input", message: "El nombre no puede estar vacío.", field: "displayName" },
        { status: 400 },
      );
    }
    return HttpResponse.json({ contactId: createdContactFixture.id, version: 1 }, { status: 201 });
  }),

  // Supabase Auth (GoTrue): solo lo que ejercen los tests de login (UC-08).
  http.post(`${SUPABASE_BASE}/auth/v1/token`, () =>
    HttpResponse.json({ error: "invalid_grant", error_description: "Invalid login credentials" }, { status: 400 }),
  ),
];
