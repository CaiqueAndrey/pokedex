import { expect, test } from "@playwright/test";

test.describe("list", () => {
  test("paginates and goes back with the browser", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("results-count")).toHaveText("Mostrando 1–24 de 63");
    await expect(page.getByTestId("pokemon-card")).toHaveCount(24);

    await page.getByRole("link", { name: "Página 3" }).click();
    await expect(page).toHaveURL(/page=3/);
    await expect(page.getByTestId("results-count")).toHaveText("Mostrando 49–63 de 63");

    await page.goBack();
    await expect(page).not.toHaveURL(/page=3/);
    await expect(page.getByTestId("results-count")).toHaveText("Mostrando 1–24 de 63");
  });

  test("clamps an out-of-range page to the last one", async ({ page }) => {
    await page.goto("/?page=999");
    await expect(page).toHaveURL(/page=3/);
  });
});

test.describe("search and filters", () => {
  test("searches by name and opens the detail page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Buscar Pokémon" }).fill("CHAR");
    await expect(page).toHaveURL(/q=CHAR/);
    await expect(page.getByTestId("pokemon-card")).toHaveCount(3);

    await page.getByRole("link", { name: "Ver detalhes de Charizard" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Charizard" })).toBeVisible();
  });

  test("searches by number", async ({ page }) => {
    await page.goto("/?q=%2325");
    await expect(page.getByTestId("pokemon-card")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Pikachu" })).toBeVisible();
  });

  test("filters by type and generation and restores state with back", async ({ page }) => {
    await page.goto("/");
    await page.getByText("Filtros", { exact: true }).first().click();
    await page.getByRole("button", { name: "Fogo" }).click();
    await expect(page).toHaveURL(/type=fire/);
    const fireCount = await page.getByTestId("pokemon-card").count();
    expect(fireCount).toBeGreaterThan(0);

    await page.getByLabel("Geração").selectOption("1");
    await expect(page).toHaveURL(/gen=1/);

    await page.goBack();
    await expect(page).not.toHaveURL(/gen=1/);
    await expect(page).toHaveURL(/type=fire/);
  });

  test("shows an empty state with a way to clear filters", async ({ page }) => {
    await page.goto("/?q=zzzzzz");
    await expect(page.getByText("Nenhum Pokémon encontrado")).toBeVisible();
    await page.getByRole("link", { name: "Limpar filtros" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("includes alternative forms on demand", async ({ page }) => {
    await page.goto("/?forms=all&type=electric,psychic");
    await expect(page.getByRole("heading", { name: "Raichu (Alola)" })).toBeVisible();
  });
});

test.describe("detail page", () => {
  test("shows forms, effectiveness and navigates the evolution tree", async ({ page }) => {
    await page.goto("/pokemon/charizard");
    await expect(page.getByRole("navigation", { name: "Formas" })).toBeVisible();
    await expect(page.getByText("Muito fraco (4×)")).toBeVisible();
    await expect(page.locator("dd", { hasText: "Pedra" }).first()).toBeVisible();

    await page.getByRole("link", { name: /Mega X/ }).click();
    await expect(page).toHaveURL(/charizard-mega-x/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Charizard (Mega X)");

    await page.goto("/pokemon/charizard");
    await page.getByRole("link", { name: "#0005 Charmeleon" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Charmeleon" })).toBeVisible();
  });

  test("handles a Pokémon without evolutions and unknown names", async ({ page }) => {
    await page.goto("/pokemon/skarmory");
    await expect(page.getByText("Este Pokémon não evolui.")).toBeVisible();

    await page.goto("/pokemon/missingno");
    await expect(page.getByText("Pokémon não encontrado", { exact: true })).toBeVisible();
  });

  test("navigates to the next Pokémon", async ({ page }) => {
    await page.goto("/pokemon/pikachu");
    await page.getByRole("link", { name: /Próximo Pokémon/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Raichu" })).toBeVisible();
  });
});

test.describe("favorites and team", () => {
  test("favorites survive a reload", async ({ page }) => {
    await page.goto("/pokemon/pikachu");
    await page.getByRole("button", { name: "Favoritar Pikachu" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Remover Pikachu dos favoritos" })).toBeVisible();

    await page.goto("/favorites");
    await expect(page.getByRole("heading", { name: "Pikachu" })).toBeVisible();

    await page.getByRole("button", { name: "Remover Pikachu dos favoritos" }).click();
    await expect(page.getByText("Você ainda não favoritou ninguém")).toBeVisible();
  });

  test("builds a team and reports shared weaknesses", async ({ page }) => {
    for (const name of ["pikachu", "skarmory", "pidgeot"]) {
      await page.goto(`/pokemon/${name}`);
      await page.getByRole("button", { name: "Adicionar ao time" }).click();
    }
    await page.goto("/team");
    await expect(page.getByTestId("team-count")).toHaveText("3/6 no time");
    await expect(page.getByTestId("team-member")).toHaveCount(3);
    // Skarmory (steel/flying) and Pidgeot (normal/flying) are weak to electric; Pikachu resists it.
    await expect(page.getByTestId("weak-electric")).toHaveText("2");

    await page.getByRole("button", { name: /Remover Pidgeot do time/ }).click();
    await expect(page.getByTestId("team-count")).toHaveText("2/6 no time");
  });
});

test.describe("compare, random and theme", () => {
  test("compares two Pokémon", async ({ page }) => {
    await page.goto("/compare?a=pikachu&b=raichu");
    await expect(page.getByTestId("cmp-b-speed")).toBeVisible();
    await expect(page.getByTestId("cmp-a-total")).toContainText("320");
    await expect(page.getByTestId("cmp-b-total")).toContainText("485");
  });

  test("random Pokémon redirects to a detail page", async ({ page }) => {
    await page.goto("/random");
    await expect(page).toHaveURL(/\/pokemon\//);
  });

  test("toggles the theme and keeps it after reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Alternar tema" }).click();
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(["light", "dark"]).toContain(theme);
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe(theme);
  });

  test("the / shortcut focuses the search field", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium");
    await page.goto("/");
    await page.keyboard.press("/");
    await expect(page.getByRole("searchbox", { name: "Buscar Pokémon" })).toBeFocused();
  });
});

test.describe("layout adjustments", () => {
  test("view toggle switches to infinite scroll and loads more", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Rolagem" }).click();
    await expect(page).toHaveURL(/view=scroll/);
    await expect(page.getByTestId("results-count")).toHaveText("63 Pokémon encontrados");
    await expect(page.getByTestId("pokemon-card")).toHaveCount(24);
    await expect(async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(page.getByTestId("pokemon-card")).toHaveCount(63, { timeout: 1_500 });
    }).toPass({ timeout: 20_000 });
    await expect(page.getByText("Fim da lista · 63 Pokémon")).toBeVisible();
  });

  test("selected Pokémon stay visible while comparing", async ({ page }) => {
    await page.goto("/compare");
    await page.getByLabel("Primeiro Pokémon").fill("pika");
    await page.getByRole("button", { name: /^Pikachu #/ }).click();
    await expect(page.getByTestId("slot-a")).toHaveText("Pikachu");

    await page.getByLabel("Segundo Pokémon").fill("raich");
    await page.getByRole("button", { name: /^Raichu #/ }).click();
    await expect(page.getByTestId("slot-a")).toHaveText("Pikachu");
    await expect(page.getByTestId("slot-b")).toHaveText("Raichu");
    await expect(page.getByTestId("cmp-b-total")).toBeVisible();

    await page.getByRole("button", { name: "Trocar Pokémon: Raichu" }).click();
    await expect(page.getByLabel("Segundo Pokémon")).toBeVisible();
    await expect(page.getByTestId("slot-a")).toHaveText("Pikachu");
  });

  test("adds a Pokémon to the team straight from its card", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Adicionar Bulbasaur ao time" }).click();
    await expect(page.getByRole("button", { name: "Remover Bulbasaur do time" })).toBeVisible();
    await page.goto("/team");
    await expect(page.getByTestId("team-count")).toHaveText("1/6 no time");
  });
});
