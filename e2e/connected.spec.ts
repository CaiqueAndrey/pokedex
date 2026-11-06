import { expect, test, type Page } from "@playwright/test";

// With the fixture PokeAPI and the clock on 2026-11-05, the daily quiz answer is Wartortle (#8).
const DAY = new Date(2026, 10, 5, 12, 0, 0);

async function solveQuiz(page: Page) {
  await page.clock.setFixedTime(DAY);
  await page.goto("/quiz");
  await page.getByLabel("Seu palpite").fill("Wartortle");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("quiz-result")).toBeVisible();
}

async function playToEnd(page: Page) {
  const done = page.locator('[data-testid="battle"][data-finished]');
  for (let i = 0; i < 12 && (await done.count()) === 0; i++) {
    const auto = page.getByTestId("choice-auto");
    if (await auto.isVisible()) await auto.click();
    else
      await page
        .getByRole("button", { name: "Pular animação" })
        .click({ timeout: 3000 })
        .catch(() => undefined);
  }
  await expect(done.first()).toBeVisible();
}

test("a Pokémon revealed by the quiz shows up as seen in the Pokédex", async ({ page }) => {
  await solveQuiz(page);
  await page.goto("/");
  await expect(page.getByTestId("dex-summary")).toContainText("1 vistos · 0 usados de 1025");
  const card = page.getByTestId("pokemon-card").filter({ hasText: "Wartortle" });
  await expect(card.getByTestId("dex-seen")).toBeVisible();

  await page.goto("/pokemon/wartortle");
  await expect(page.getByTestId("game-facts")).toContainText("Visto");
  await page.getByTestId("compare-with").click();
  await expect(page).toHaveURL(/\/compare\?a=wartortle/);
});

test("Meu time fights a friendly battle against Brock", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pokedex:team:v1", JSON.stringify(["pikachu", "skarmory", "pidgeot"]));
  });
  await page.goto("/team");
  const friendly = page.getByTestId("friendly");
  await friendly.getByRole("button", { name: "Enfrentar Brock" }).click();
  await expect(page.getByTestId("battle-header")).toContainText("Amistoso · Ginásio de Pewter");
  await playToEnd(page);
  await expect(page.getByRole("button", { name: "Jogar de novo" })).toBeVisible();
  await page.getByRole("button", { name: "Voltar ao time" }).click();
  await expect(friendly.getByRole("button", { name: "Enfrentar Misty" })).toBeVisible();
});

test("favorites are marked in the draft and can be the trainer's partner", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pokedex:favorites:v1", JSON.stringify(["bronzor", "pikachu"]));
    localStorage.setItem(
      "pokedex:trainer:v1",
      JSON.stringify({ name: "Ash", id: "00001", since: "2026-11-01" }),
    );
  });
  // Seed e2e2 opens the draft with a Steel roll that offers Bronzor.
  await page.goto("/gym?seed=e2e2");
  await expect(page.getByTestId("daily")).toBeVisible();
  await page.getByRole("button", { name: "Jogar no Fácil" }).click();
  await expect(page.getByTestId("favorite-tag")).toHaveCount(1);

  await page.goto("/gym/treinador");
  await page.getByTestId("partner-select").selectOption("pikachu");
  await expect(page.getByTestId("trainer-card")).toContainText("Pikachu");
});

test("the hub has weekly missions; rewards keep some achievements secret", async ({ page }) => {
  await page.goto("/gym");
  await expect(page.getByTestId("daily")).toBeVisible();
  // On the hub the missions are one line; the list opens in a dialog.
  await page.getByTestId("missions-open").click();
  await expect(page.getByTestId("missions-open-dialog").getByTestId("mission")).toHaveCount(3);
  await page.getByTestId("missions-open-dialog").getByRole("button", { name: "Fechar" }).click();
  await page.getByRole("link", { name: "Recompensas", exact: true }).click();
  await expect(page.getByTestId("missions")).toBeVisible();
  await expect(page.getByTestId("achievements")).toContainText("Conquista secreta");
  await expect(page.getByTestId("achievement-progress").first()).toBeVisible();
});
