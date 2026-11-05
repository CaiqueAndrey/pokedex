import { z } from "zod";

// Only the fields the app uses are validated; everything else is ignored on purpose.

const namedResource = z.object({ name: z.string(), url: z.string() });

export const resourceListSchema = z.object({
  count: z.number(),
  results: z.array(namedResource),
});

export const pokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_default: z.boolean(),
  height: z.number(),
  weight: z.number(),
  species: namedResource,
  types: z.array(z.object({ slot: z.number(), type: z.object({ name: z.string() }) })),
  stats: z.array(z.object({ base_stat: z.number(), stat: z.object({ name: z.string() }) })),
  abilities: z.array(z.object({ is_hidden: z.boolean(), ability: z.object({ name: z.string() }) })),
  sprites: z.object({
    front_default: z.string().nullable(),
    front_shiny: z.string().nullable(),
    other: z
      .object({
        "official-artwork": z
          .object({
            front_default: z.string().nullable(),
            front_shiny: z.string().nullable(),
          })
          .optional(),
      })
      .optional(),
  }),
  cries: z.object({ latest: z.string().nullable().optional() }).optional(),
});

const language = z.object({ name: z.string() });

export const speciesSchema = z.object({
  id: z.number(),
  name: z.string(),
  generation: z.object({ name: z.string() }),
  evolution_chain: z.object({ url: z.string() }).nullable(),
  varieties: z.array(z.object({ is_default: z.boolean(), pokemon: namedResource })),
  genera: z.array(z.object({ genus: z.string(), language })),
  flavor_text_entries: z.array(z.object({ flavor_text: z.string(), language })),
});

const damageRelation = z.array(z.object({ name: z.string() }));

export const typeSchema = z.object({
  name: z.string(),
  damage_relations: z.object({
    double_damage_to: damageRelation,
    half_damage_to: damageRelation,
    no_damage_to: damageRelation,
  }),
  pokemon: z.array(z.object({ slot: z.number(), pokemon: namedResource })),
});

export const generationSchema = z.object({
  name: z.string(),
  pokemon_species: z.array(namedResource),
});

const evolutionDetail = z.object({
  trigger: z.object({ name: z.string() }),
  min_level: z.number().nullable().optional(),
  min_happiness: z.number().nullable().optional(),
  item: z.object({ name: z.string() }).nullable().optional(),
  held_item: z.object({ name: z.string() }).nullable().optional(),
  known_move: z.object({ name: z.string() }).nullable().optional(),
  time_of_day: z.string().optional(),
  location: z.object({ name: z.string() }).nullable().optional(),
});

export interface ChainLink {
  species: { name: string; url: string };
  evolution_details: z.infer<typeof evolutionDetail>[];
  evolves_to: ChainLink[];
}

const chainLink: z.ZodType<ChainLink> = z.lazy(() =>
  z.object({
    species: namedResource,
    evolution_details: z.array(evolutionDetail),
    evolves_to: z.array(chainLink),
  }),
);

export const evolutionChainSchema = z.object({ id: z.number(), chain: chainLink });

export const itemSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: namedResource,
  sprites: z.object({ default: z.string().nullable() }),
});

export type PokemonResponse = z.infer<typeof pokemonSchema>;
export type SpeciesResponse = z.infer<typeof speciesSchema>;
export type TypeResponse = z.infer<typeof typeSchema>;
export type GenerationResponse = z.infer<typeof generationSchema>;
export type EvolutionChainResponse = z.infer<typeof evolutionChainSchema>;
export type ItemResponse = z.infer<typeof itemSchema>;
