import { expect, test, type Page } from "@playwright/test";

// The daily answer comes from the date and the species list. With the fixture PokeAPI (63 species)
// and the clock fixed on 2026-11-05, today's Pokémon is Wartortle (`dailyAnswer` in lib/quiz.ts).
const DAY = new Date(2026, 10, 5, 12, 0, 0);

async function openQuiz(page: Page) {
  await page.clock.setFixedTime(DAY);
  await page.goto("/quiz");
  await expect(page.getByTestId("daily-quiz")).toBeVisible();
}

async function guess(page: Page, typed: string, option: string) {
  await page.getByLabel("Seu palpite").fill(typed);
  await page.getByRole("option", { name: option }).click();
}

test("the daily quiz: a miss unlocks a hint, the answer reveals it and pays", async ({ page }) => {
  await openQuiz(page);
  await expect(page.getByTestId("attempt")).toHaveText("Palpite 1 de 5");
  await expect(page.getByTestId("hint-open")).toHaveCount(0);

  // Unknown names don't cost a guess.
  await page.getByLabel("Seu palpite").fill("zzzz");
  await page.getByRole("button", { name: "Chutar" }).click();
  await expect(page.getByText(/Não conhecemos esse Pokémon/)).toBeVisible();

  await guess(page, "bulba", "Bulbasaur");
  await expect(page.getByTestId("wrong-guess")).toContainText("Nenhum tipo em comum");
  await expect(page.getByTestId("hint-open")).toHaveCount(1);
  await expect(page.getByTestId("hints")).toContainText("Água");

  // Typing the exact name and pressing Enter works too.
  await page.getByLabel("Seu palpite").fill("Wartortle");
  await page.keyboard.press("Enter");
  const result = page.getByTestId("quiz-result");
  await expect(result).toContainText("É o Wartortle!");
  await expect(result).toContainText("Grande Bola");
  await expect(page.getByTestId("attempt")).toHaveText("Acertou em 2 palpites.");
  await expect(page.getByTestId("silhouette")).toHaveAttribute("data-revealed", "true");
  await expect(page.getByRole("button", { name: "Compartilhar" })).toBeVisible();

  // Saved: a reload shows the result, not a new attempt.
  await page.reload();
  await expect(page.getByTestId("quiz-result")).toContainText("É o Wartortle!");

  // It counts for the streak and shows on the gym's hub.
  await page.goto("/gym");
  await expect(page.getByTestId("quiz-hub-card")).toContainText("🟥🟩");
  await expect(page.getByTestId("daily-streak")).toContainText("Sequência: 1 dia");
});

test("five misses end the day and name the answer", async ({ page }) => {
  await openQuiz(page);
  for (const [typed, option] of [
    ["bulba", "Bulbasaur"],
    ["ivy", "Ivysaur"],
    ["venu", "Venusaur"],
    ["charmander", "Charmander"],
    ["charmeleon", "Charmeleon"],
  ] as const) {
    await guess(page, typed, option);
  }
  await expect(page.getByTestId("quiz-result")).toContainText("Era o Wartortle.");
  await expect(page.getByTestId("hint-locked")).toHaveCount(0);
});

test("endless mode: start, guess, keep a streak", async ({ page }) => {
  await openQuiz(page);
  await page.getByRole("button", { name: "Infinito" }).click();
  await expect(page.getByTestId("endless-intro")).toContainText("Recorde: 0");
  await page.getByRole("button", { name: "Próximo Pokémon" }).click();
  await expect(page.getByTestId("endless-streak")).toHaveText("Sequência: 0");
  await expect(page.getByLabel("Seu palpite")).toBeVisible();
});

test("the quiz is one click away: header and home banner", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("quiz-banner")).toBeVisible();
  await page.getByTestId("nav-quiz").click();
  await expect(page.getByRole("heading", { name: "Quem é esse Pokémon?", level: 1 })).toBeVisible();
});
