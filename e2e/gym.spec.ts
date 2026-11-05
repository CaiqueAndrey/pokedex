import { expect, test, type Page } from "@playwright/test";

// Seeds found with the engine (rules v2, scouting trainers who don't repeat each other): drafting the strongest legal offer
// every round with the default order, `e2e2` wins all five battles in easy mode; drafting the
// weakest, `e2e2` loses the first one. In hard mode, `e2e5` shows a blocked offer. Battles are
// deterministic, so these never flake.

/** The daily challenge block only renders on the client: once it shows, the page is hydrated. */
async function hydrated(page: Page) {
  await expect(page.getByTestId("daily")).toBeVisible();
}

async function begin(page: Page, mode: "Fácil" | "Difícil" = "Fácil") {
  await hydrated(page);
  await page.getByRole("button", { name: `Jogar no ${mode}` }).click();
}

/** A fixed day, so the daily ambush (calibrated from the date) is the same on every run. */
const DAY = new Date(2026, 10, 5, 12, 0, 0);

/** The ambush hand is sorted by strength: the three weakest always fit the cap. */
async function pickWeakestThree(page: Page) {
  for (let i = 0; i < 3; i++) {
    await page
      .getByTestId("rocket-ambush")
      .getByRole("button", { name: /^Escolher / })
      .first()
      .click();
  }
}

/** The start screen: the hub with the challenges. */
const hub = (page: Page) => page.getByRole("heading", { name: "Escolha seu desafio" });

async function draftStrongest(page: Page, pick: "first" | "last" = "last") {
  for (let round = 1; round <= 6; round++) {
    await expect(page.getByRole("heading", { name: `Draft · rodada ${round} de 6` })).toBeVisible();
    await page
      .getByRole("button", { name: /^Escolher / })
      [pick]()
      .click();
  }
  await expect(page.getByRole("button", { name: "Batalhar!" })).toBeVisible();
}

/**
 * Fights the next battle and skips to its end. A pending reward is skipped first, and when one of
 * your Pokémon faints with a choice to make, the recommended one goes in.
 */
async function fightAndSkip(page: Page) {
  const skipReward = page.getByRole("button", { name: "Dispensar" });
  if (await skipReward.isVisible()) await skipReward.click();
  await page.getByRole("button", { name: "Batalhar!" }).click();
  await playToEnd(page);
}

async function playToEnd(page: Page) {
  const done = page.locator('[data-testid="battle"][data-finished]');
  const skip = page.getByRole("button", { name: "Pular animação" });
  const auto = page.getByTestId("choice-auto");
  for (let i = 0; i < 12; i++) {
    await expect(done.or(skip).or(auto).first()).toBeVisible();
    if ((await done.count()) > 0) return;
    if (await auto.isVisible()) await auto.click();
    else if (await skip.isVisible()) await skip.click().catch(() => undefined);
  }
}

async function loseFirstBattle(page: Page) {
  await page.goto("/gym?seed=e2e2");
  await begin(page);
  await draftStrongest(page, "first");
  await fightAndSkip(page);
  return page.getByRole("dialog", { name: "Fim do desafio" });
}

test("drafts a team, wins five battles and keeps the badge after reload", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/gym?seed=e2e2");
  await begin(page);
  await expect(page.getByTestId("die-result")).toContainText("O dado caiu em");
  await draftStrongest(page);
  await expect(page.getByTestId("order-item")).toHaveCount(6);

  for (let battle = 1; battle <= 4; battle++) {
    await expect(page.getByText(`Batalha ${battle} de 5`)).toBeVisible();
    await fightAndSkip(page);
    await expect(page.getByRole("status").filter({ hasText: "Vitória! Próximo:" })).toBeVisible();
    await page.getByRole("button", { name: "Próxima batalha" }).click();
  }
  await expect(page.getByTestId("counter-hint")).toContainText("Brock");
  await fightAndSkip(page);

  // The deciding battle opens the result dialog straight away.
  const dialog = page.getByRole("dialog", { name: "Insígnia da Rocha conquistada!" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("run-mvp")).toBeVisible();
  await expect(dialog.getByTestId("unlocked")).toContainText("Campeão de Pewter");
  await expect(dialog.getByTestId("reward")).toContainText("Ultra Bola");
  await dialog.getByRole("button", { name: "Ver histórico" }).click();
  await expect(page.getByTestId("run-result")).toBeVisible();
  await expect(page.getByTestId("path-won")).toHaveCount(5);
  await expect(page.getByTestId("path-score").first()).toContainText("Placar");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Insígnia da Rocha conquistada!" })).toBeVisible();
  await page.getByRole("button", { name: "Novo desafio" }).first().click();
  await expect(hub(page)).toBeVisible();
  // The last run shows up on the hub and in the history; the rewards live in their own tab.
  await expect(page.getByTestId("history-entry")).toHaveCount(1);
  await page.getByRole("link", { name: "Recompensas", exact: true }).click();
  await expect(page.getByRole("img", { name: "Insígnia da Rocha" })).toBeVisible();
  await expect(page.getByTestId("gym-stats")).toContainText("Insígnias");
  await expect(page.getByTestId("achievement-unlocked")).not.toHaveCount(0);
  await expect(page.getByTestId("balls")).toContainText("Ultra Bola");
});

test("a defeat opens the result dialog, then the history, then the mode choice", async ({
  page,
}) => {
  const dialog = await loseFirstBattle(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: /Game over/ })).toBeVisible();
  await expect(dialog).toContainText("Você venceu 0 de 5 batalhas.");
  await dialog.getByRole("button", { name: "Ver histórico" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("path-lost")).toHaveCount(1);

  // A new challenge always goes back to choosing the mode.
  await page.getByRole("button", { name: "Novo desafio" }).first().click();
  await expect(hub(page)).toBeVisible();
});

test("Esc closes the result dialog into the history", async ({ page }) => {
  const dialog = await loseFirstBattle(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("run-result")).toBeVisible();
});

test("'Novo desafio' in the result dialog goes to the mode choice", async ({ page }) => {
  const dialog = await loseFirstBattle(page);
  await dialog.getByRole("button", { name: "Novo desafio" }).click();
  await expect(hub(page)).toBeVisible();
  // The last mode played is highlighted.
  await expect(page.getByTestId("mode-card-easy")).toContainText("Último jogado");
});

test("abandoning asks for confirmation", async ({ page }) => {
  await page.goto("/gym?seed=e2e2");
  await begin(page);
  await page.getByRole("button", { name: "Abandonar desafio" }).click();
  const dialog = page.getByRole("dialog", { name: "Abandonar o desafio?" });
  await dialog.getByRole("button", { name: "Continuar jogando" }).click();
  await expect(page.getByRole("heading", { name: "Draft · rodada 1 de 6" })).toBeVisible();

  await page.getByRole("button", { name: "Abandonar desafio" }).click();
  await dialog.getByRole("button", { name: "Abandonar", exact: true }).click();
  await expect(hub(page)).toBeVisible();
});

test("the draft survives a reload and the reroll can be used once", async ({ page }) => {
  await page.goto("/gym?seed=e2e2");
  await begin(page);
  await page
    .getByRole("button", { name: /^Escolher / })
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "Draft · rodada 2 de 6" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Draft · rodada 2 de 6" })).toBeVisible();

  const reroll = page.getByRole("button", { name: /Rolar de novo/ });
  await reroll.click();
  await expect(reroll).toBeDisabled();
});

test("the team order can be changed before a battle", async ({ page }) => {
  await page.goto("/gym?seed=e2e2");
  await begin(page);
  await draftStrongest(page);
  const first = page.getByTestId("order-item").first();
  const before = await first.innerText();
  await page
    .getByRole("button", { name: /^Descer / })
    .first()
    .click();
  await expect(first).not.toHaveText(before);
});

test("the daily ambush: attempts are saved and count for the streak", async ({ page }) => {
  await page.clock.setFixedTime(DAY);
  await page.goto("/gym");
  await hydrated(page);
  await page.getByRole("link", { name: "Jogar o desafio de hoje" }).click();
  const ambush = page.getByTestId("rocket-ambush");
  await expect(ambush).toBeVisible();
  await expect(page.getByText(/^Desafio do dia \d\d\/\d\d$/)).toBeVisible();
  await expect(page.getByTestId("rocket-opponent")).toHaveCount(4);
  await pickWeakestThree(page);
  await page.getByRole("button", { name: /^Atacar!/ }).click();
  await page.getByRole("button", { name: "Pular animação" }).click();
  await page.getByRole("button", { name: "Voltar ao quebra-cabeça" }).click();
  await expect(page.getByTestId("rocket-attempt")).toHaveCount(1);

  // Back on the hub: today's progress, the streak and the countdown.
  await page.goto("/gym");
  await hydrated(page);
  await expect(page.getByTestId("daily-played")).toContainText(/Faltam 2 tentativas|Você venceu/);
  await expect(page.getByTestId("daily-streak")).toContainText("Sequência: 1 dia");
  await expect(page.getByTestId("daily-countdown")).toContainText(/Novo desafio em \d\d:\d\d:\d\d/);
  await expect(page.getByRole("link", { name: "Jogar o desafio de hoje" })).toHaveCount(0);
});

test.describe("modes, history and controls", () => {
  test("easy mode shows the opponent in order, your stats, matchups and the cap", async ({
    page,
  }) => {
    await page.goto("/gym?seed=e2e2");
    await begin(page);
    await expect(page.getByTestId("mini-stats").first()).toBeVisible();
    await expect(page.getByTestId("budget")).toContainText("2800");
    await draftStrongest(page);
    await expect(page.getByTestId("opponent-pokemon")).toHaveCount(6);
    await expect(page.getByText("Abre a batalha", { exact: true })).toBeVisible();
    await expect(page.getByTestId("opponent-power")).toContainText("Força total");
    await expect(page.getByTestId("order-item").first().getByTestId("mini-stats")).toBeVisible();
    await expect(page.locator("[data-testid^=matchup-]")).toHaveCount(6);
  });

  test("hard mode hides the opponent's team, your stats and the matchups", async ({ page }) => {
    await page.goto("/gym?seed=e2e2");
    await begin(page, "Difícil");
    await expect(page.getByTestId("mini-stats")).toHaveCount(0);
    await expect(page.getByTestId("budget")).toContainText("2500");
    await draftStrongest(page);
    await expect(page.getByTestId("hidden-pokemon")).toHaveCount(6);
    await expect(page.getByTestId("opponent-pokemon")).toHaveCount(0);
    await expect(page.locator("[data-testid^=matchup-]")).toHaveCount(0);
    await expect(page.getByText(/Modo Difícil · Semente/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ginásio de Cerulean" })).toBeVisible();
    await expect(page.getByTestId("run-path")).toContainText("Misty");
  });

  test("the path records each battle and resets with a new run", async ({ page }) => {
    await page.goto("/gym?seed=e2e2");
    await begin(page);
    await draftStrongest(page);
    await expect(page.getByTestId("path-next")).toHaveCount(1);
    await fightAndSkip(page);
    await page.getByRole("button", { name: "Próxima batalha" }).click();
    await expect(page.getByTestId("path-won")).toHaveCount(1);
    // Trainer names are drawn per run: a class from the Pewter Gym plus a first name.
    await expect(page.getByTestId("path-won")).toContainText(
      /Campista|Escoteira|Garota do Piquenique/,
    );

    await page.getByRole("button", { name: "Abandonar desafio" }).click();
    await page.getByRole("button", { name: "Abandonar", exact: true }).click();
    await begin(page);
    await draftStrongest(page);
    await expect(page.getByTestId("path-won")).toHaveCount(0);
  });

  test("team order: tap two Pokémon to swap them", async ({ page }) => {
    await page.goto("/gym?seed=e2e2");
    await begin(page);
    await draftStrongest(page);
    const items = page.getByTestId("order-item");
    const names = async () => (await items.allInnerTexts()).map((t) => t.split("\n").join(" "));
    const before = await names();

    await items.nth(0).getByRole("button", { pressed: false }).first().click();
    await items.nth(2).getByRole("button", { pressed: false }).first().click();
    const swapped = await names();
    expect(swapped[0]).toContain(before[2]?.split(" ")[1] ?? "");
  });

  test("battle speed and sound are selectable and remembered", async ({ page }) => {
    await page.goto("/gym");
    await hydrated(page);
    await page.getByRole("button", { name: "Rápida" }).click();
    await expect(page.getByRole("button", { name: "Rápida" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const sound = page.getByRole("button", { name: "Som e vibração" });
    await expect(sound).toHaveAttribute("aria-pressed", "true");
    await sound.click();
    await expect(sound).toHaveAttribute("aria-pressed", "false");
    await page.reload();
    await expect(page.getByRole("button", { name: "Rápida" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(sound).toHaveAttribute("aria-pressed", "false");
  });

  test("the game works where Web Audio is missing", async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-expect-error -- simulating a browser without Web Audio
      delete window.AudioContext;
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const dialog = await loseFirstBattle(page);
    await expect(dialog).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("drag and drop (desktop mouse)", () => {
  // A mouse, not touch: HTML5 drag events only fire for mouse input.
  test.use({ hasTouch: false, isMobile: false, viewport: { width: 1280, height: 900 } });

  test("dragging a Pokémon onto the first slot reorders the team", async ({ page }) => {
    await page.goto("/gym?seed=e2e2");
    await begin(page);
    await draftStrongest(page);
    const items = page.getByTestId("order-item");
    // Drag by the grip handle onto the first row (rows next to each other: no scrolling in between).
    const second = (await items.nth(1).innerText()).split("\n")[1] ?? "";
    await items.nth(1).scrollIntoViewIfNeeded();
    await items.nth(1).dragTo(items.nth(0), { sourcePosition: { x: 12, y: 30 } });
    await expect(items.nth(0)).toContainText(second);
  });
});

test.describe("focus layout and battle details", () => {
  test("the gym hides the footer and the search bar", async ({ page }) => {
    await page.goto("/gym");
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("hard mode: strong offers that don't fit show up blocked", async ({ page }) => {
    await page.goto("/gym?seed=e2e5");
    await begin(page, "Difícil");
    let blockedSeen = 0;
    for (let round = 1; round <= 6; round++) {
      await expect(
        page.getByRole("heading", { name: `Draft · rodada ${round} de 6` }),
      ).toBeVisible();
      blockedSeen += await page.getByRole("button", { name: /não cabe no limite/ }).count();
      await page
        .getByRole("button", { name: /^Escolher / })
        .last()
        .click();
    }
    expect(blockedSeen).toBeGreaterThan(0);
  });

  test("the battle shows both fighters' types", async ({ page }) => {
    await page.goto("/gym?seed=e2e2");
    await begin(page);
    await draftStrongest(page);
    await page.getByRole("button", { name: "Batalhar!" }).click();
    await expect(page.getByTestId("fighter-types-player")).not.toBeEmpty();
    await expect(page.getByTestId("fighter-types-opponent")).not.toBeEmpty();
  });
});

test.describe("hub, rewards and legendaries", () => {
  test("the hub explains each challenge and what it gives", async ({ page }) => {
    await page.goto("/gym");
    await hydrated(page);
    await expect(page.getByText("Role o dado. Monte seu time. Vença o ginásio.")).toBeVisible();
    await expect(page.getByTestId("prize-easy")).toContainText("Insígnia da Rocha");
    await expect(page.getByTestId("prize-easy")).toContainText("Ultra Bola");
    await expect(page.getByTestId("prize-hard")).toContainText("Master Ball");
    await expect(page.getByTestId("prize-daily")).toContainText("Ultra Bola");
    await expect(page.getByTestId("mode-card-daily")).toContainText("1ª tentativa: Ultra Bola");
    // Without a Master Ball the legendary encounter only explains how to get one.
    await expect(page.getByTestId("legendary-option")).toContainText("Ganhe uma Master Ball");
    await page.getByRole("link", { name: "Recompensas", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Recompensas" })).toBeVisible();
    await expect(page.getByTestId("bag")).toContainText("Pedra do Trovão");
    await expect(page.getByTestId("legends")).toContainText("0 de 26");
  });

  test("past daily challenges can be replayed as practice", async ({ page }) => {
    await page.goto("/gym");
    await hydrated(page);
    await page.getByText("Desafios anteriores").click();
    await page
      .getByRole("link", { name: /^Treinar \d\d\/\d\d$/ })
      .first()
      .click();
    await expect(page.getByText(/^Treino · Desafio do dia/)).toBeVisible();
    await expect(page.getByText("Treino: não vale recompensas")).toBeVisible();
    await expect(page.getByTestId("rocket-ambush")).toBeVisible();
  });

  test("a Master Ball opens a legendary encounter and catches the pick", async ({ page }) => {
    await page.addInitScript(() => {
      const key = "pokedex:gym-stats:v1";
      if (localStorage.getItem(key)) return;
      const stats = {
        runs: 1,
        cleared: { easy: 0, hard: 1, daily: 0 },
        balls: { poke: 0, great: 0, ultra: 0, master: 1 },
        battlesWon: 5,
        best: 5,
        dailyBest: 0,
        streak: 1,
        bestStreak: 1,
        used: {},
        caught: [],
      };
      localStorage.setItem(key, JSON.stringify(stats));
    });
    await page.goto("/gym?seed=e2e2");
    await hydrated(page);
    await page.getByLabel("Usar uma Master Ball (você tem 1)").check();
    await page.getByRole("button", { name: "Jogar no Fácil" }).click();
    await expect(page.getByTestId("legendary-round")).toBeVisible();
    await expect(page.getByText("✦ Lendário")).toHaveCount(3);
    await page
      .getByRole("button", { name: /^Escolher / })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: "Draft · rodada 2 de 6" })).toBeVisible();
    await expect(page.getByTestId("legendary-round")).toHaveCount(0);

    await page.getByRole("button", { name: "Abandonar desafio" }).click();
    const dialog = page.getByRole("dialog", { name: "Abandonar o desafio?" });
    await expect(dialog).toContainText("A Master Ball usada não volta.");
    await dialog.getByRole("button", { name: "Abandonar", exact: true }).click();
    await expect(page.getByTestId("legendary-option")).toContainText("Ganhe uma Master Ball");
    await page.getByRole("link", { name: "Recompensas", exact: true }).click();
    await expect(page.getByTestId("legends")).toContainText("1 de 26");
  });
});

test.describe("trainer, history, gauntlet and navigation", () => {
  test("the gym is one click away: header button and home banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("nav-gym")).toBeVisible();
    await expect(page.getByTestId("gym-banner")).toBeVisible();
    await page.getByTestId("gym-banner").getByRole("link", { name: "Jogar agora" }).click();
    await expect(hub(page)).toBeVisible();
  });

  test("a trainer name shows on the card and in battle", async ({ page }) => {
    await page.goto("/gym/treinador");
    await page.getByLabel("Nome de treinador").fill("  Ash   Ketchum ");
    await page.getByRole("button", { name: "Salvar nome" }).click();
    await expect(page.getByTestId("trainer-name")).toHaveText("Ash Ketchum");
    await expect(page.getByTestId("trainer-level")).toHaveText("Nível 1");
    await expect(page.getByTestId("trainer-chip")).toContainText("Ash Ketchum");

    await page.getByRole("link", { name: "Jogar", exact: true }).click();
    await page.goto("/gym?seed=e2e2");
    await begin(page);
    await draftStrongest(page);
    await page.getByRole("button", { name: "Batalhar!" }).click();
    // A "VS" card first, then a header with both names for the whole battle.
    await expect(page.getByTestId("battle-intro")).toContainText("quer batalhar!");
    await expect(page.getByTestId("battle-header")).toContainText("Ash Ketchum ×");
    await expect(page.getByTestId("fighter-player")).toContainText("Ash Ketchum");
  });

  test("a defeat lands in the history tab and gives XP on the next level bar", async ({ page }) => {
    const dialog = await loseFirstBattle(page);
    await dialog.getByRole("button", { name: "Ver histórico" }).click();
    await page.getByRole("link", { name: "Histórico", exact: true }).click();
    await expect(page.getByTestId("history-entry")).toHaveCount(1);
    await expect(page.getByTestId("history-entry")).toContainText("Ginásio de Pewter");
    await page.getByText("Ver batalhas").click();
    await expect(page.getByTestId("path-lost")).toHaveCount(1);
  });

  test("the ambush puzzle: pick 3 in order, the same plan can't be retried", async ({ page }) => {
    await page.clock.setFixedTime(DAY);
    await page.goto("/gym/emboscada");
    const hand = page.getByTestId("rocket-ambush");
    await expect(hand.getByRole("button", { name: /^Escolher / })).toHaveCount(8);
    const attack = page.getByRole("button", { name: /^Atacar!/ });
    await expect(attack).toBeDisabled();
    await pickWeakestThree(page);
    await expect(page.getByTestId("rocket-slot")).toHaveCount(3);
    await expect(page.getByTestId("rocket-strength")).toContainText("/ 1250");
    await attack.click();
    await expect(page.getByTestId("battle-header")).toContainText("Tentativa 1 de 3");
    await page.getByRole("button", { name: "Pular animação" }).click();
    await page.getByRole("button", { name: "Voltar ao quebra-cabeça" }).click();
    const won = await page.getByTestId("rocket-result").count();
    if (won === 0) {
      // The team stays picked to tweak it; the same three in the same order would lose the same way.
      await expect(page.getByText("Você já tentou esse time nessa ordem")).toBeVisible();
      await expect(attack).toBeDisabled();
    }
  });
});

test.describe("usability: next step, action bar, tips and reset", () => {
  test("a first visit suggests the easy gym; the action bar holds the fight button", async ({
    page,
  }) => {
    await page.goto("/gym?seed=e2e2");
    await hydrated(page);
    const next = page.getByTestId("next-step");
    await expect(next).toContainText("Comece pelo Ginásio de Pewter");
    await next.getByRole("button", { name: "Começar no Fácil" }).click();
    await expect(page.getByRole("heading", { name: "Draft · rodada 1 de 6" })).toBeVisible();
    // The gym tabs step aside during a run; a first-run tip explains the draft.
    await expect(page.getByRole("navigation", { name: "Seções do Modo Ginásio" })).toHaveCount(0);
    await expect(page.getByTestId("tip-draft")).toBeVisible();
    await page.getByTestId("tip-draft").getByRole("button", { name: "Entendi" }).click();
    await expect(page.getByTestId("tip-draft")).toHaveCount(0);
    await draftStrongest(page);
    const bar = page.getByTestId("action-bar");
    await expect(bar.getByRole("button", { name: "Batalhar!" })).toBeInViewport();
    await expect(page.getByTestId("lead-hint")).toContainText("Abre a batalha");
  });

  test("the hub explains both ways to a Master Ball", async ({ page }) => {
    await page.goto("/gym");
    await hydrated(page);
    const paths = page.getByTestId("legendary-paths");
    await expect(paths).toContainText("Vença a Misty no Difícil");
    await expect(paths).toContainText("3 dias seguidos");
  });

  test("resetting progress asks for the confirmation word and clears everything", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("pokedex:badges:v1", JSON.stringify(["boulder"]));
      localStorage.setItem(
        "pokedex:trainer:v1",
        JSON.stringify({ name: "Misty Fã", id: "12345", since: "2026-11-01" }),
      );
      localStorage.setItem("pokedex:favorites:v1", JSON.stringify(["pikachu"]));
    });
    await page.goto("/gym/treinador");
    await expect(page.getByTestId("trainer-name")).toHaveText("Misty Fã");
    await page.getByRole("button", { name: "Apagar todo o progresso" }).click();
    const dialog = page.getByRole("dialog", { name: "Apagar todo o progresso?" });
    await expect(dialog).toContainText("insígnias, Pokébolas");
    const confirm = dialog.getByRole("button", { name: "Apagar tudo" });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel("Digite APAGAR para confirmar").fill("apagar");
    await confirm.click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Progresso apagado. Bom recomeço!")).toBeVisible();
    await expect(page.getByTestId("trainer-name")).toHaveText("Escolha seu nome de treinador");
    // Favorites belong to the Pokédex: they stay.
    const favorites = await page.evaluate(() => localStorage.getItem("pokedex:favorites:v1"));
    expect(favorites).toContain("pikachu");
    await page.getByRole("link", { name: "Recompensas", exact: true }).click();
    await expect(
      page.getByTestId("badges").getByRole("img", { name: "Insígnia da Rocha" }).locator(".."),
    ).toHaveClass(/grayscale/);
  });

  test("phones get a one-line header with a menu", async ({ page }) => {
    await page.goto("/gym");
    await page.getByTestId("mobile-menu").locator("summary").click();
    await page.getByRole("link", { name: "Meu time" }).click();
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByRole("link", { name: "Surpreenda-me" })).toHaveCount(0);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Surpreenda-me" })).toBeVisible();
  });
});

test.describe("game depth: choices, rewards, the bag and fields", () => {
  test("a fainted Pokémon lets you choose who comes in", async ({ page }) => {
    await page.goto("/gym?seed=e2e2");
    await begin(page);
    await draftStrongest(page, "first");
    await page.getByRole("button", { name: "Batalhar!" }).click();
    await page.getByRole("button", { name: "Pular animação" }).click();
    const panel = page.getByTestId("replace");
    await expect(panel).toBeVisible();
    await expect(panel).toContainText("desmaiou! Quem entra?");
    await expect(page.getByTestId("choice-auto")).toContainText("Recomendado");
    await page.getByTestId("choice-option").first().click();
    await expect(panel).toBeHidden();

    // The battle is saved with the pick: a reload resumes it instead of the pre-battle screen.
    await page.reload();
    await expect(page.getByTestId("battle-header")).toBeVisible();
    await playToEnd(page);
    await expect(page.getByRole("dialog", { name: "Fim do desafio" })).toBeVisible();
  });

  test("a won battle offers a reward; training marks the Pokémon", async ({ page }) => {
    await page.goto("/gym?seed=e2e2");
    await begin(page);
    await draftStrongest(page);
    await fightAndSkip(page);
    await page.getByRole("button", { name: "Próxima batalha" }).click();
    const reward = page.getByTestId("battle-reward");
    await expect(reward).toBeVisible();
    await expect(page.getByRole("button", { name: "Batalhar!" })).toBeDisabled();
    await reward.getByTestId("reward-train").click();
    await reward.getByTestId("reward-target").first().click();
    await expect(reward).toBeHidden();
    await expect(page.getByTestId("trained")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Batalhar!" })).toBeEnabled();
  });

  test("bag items: a Rare Candy evolves, a Nugget buys a reroll", async ({ page }) => {
    await page.addInitScript(() => {
      if (sessionStorage.getItem("bag-seeded")) return;
      sessionStorage.setItem("bag-seeded", "1");
      localStorage.setItem("pokedex:gym-bag:v1", JSON.stringify({ "rare-candy": 1, nugget: 1 }));
    });
    await page.goto("/gym?seed=e2e2");
    await begin(page);
    const reroll = page.getByRole("button", { name: /Rolar de novo/ });
    await reroll.click();
    const buy = page.getByRole("button", { name: "Usar Pepita: +1 rolagem" });
    await expect(buy).toBeVisible();
    await buy.click();
    await expect(buy).toHaveCount(0);
    await expect(reroll).toBeDisabled();

    await draftStrongest(page, "first");
    await page.getByTestId("bag-button").click();
    const use = page.getByTestId("bag-use").first();
    const text = await use.innerText();
    await use.click();
    const evolvedTo = text.split("→").at(-1)?.trim() ?? "";
    await expect(page.getByTestId("order-item").filter({ hasText: evolvedTo })).toHaveCount(1);
    await expect(page.getByTestId("bag-button")).toHaveCount(0);
  });

  test("each gym has its field, shown on the hub and before battles", async ({ page }) => {
    await page.goto("/gym?seed=e2e2");
    await hydrated(page);
    await expect(page.getByTestId("field-easy")).toContainText("Terreno rochoso");
    await expect(page.getByTestId("field-hard")).toContainText("Chuva");
    await begin(page);
    await draftStrongest(page);
    await expect(page.getByTestId("field")).toContainText("Pedra e Terra");
  });
});
