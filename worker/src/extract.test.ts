import { describe, expect, it } from "vitest";
import { extractRecipeFromHtml } from "./extract";

describe("extractRecipeFromHtml", () => {
  it("finds a Recipe inside an @graph and flattens HowTo sections", () => {
    const html = `
      <html>
        <head>
          <link rel="canonical" href="https://food.test/best-cookies">
          <meta property="og:site_name" content="Test Kitchen">
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@graph": [
              {"@type":"WebPage","name":"Best cookies"},
              {
                "@type":["Recipe","NewsArticle"],
                "name":"Chocolate Chip Cookies",
                "author":{"@type":"Person","name":"Ada Baker"},
                "prepTime":"PT15M",
                "cookTime":"PT12M",
                "recipeYield":["18 cookies"],
                "recipeIngredient":[
                  "1 cup butter",
                  "1 cup brown sugar",
                  "2 cups flour"
                ],
                "recipeInstructions":[
                  {
                    "@type":"HowToSection",
                    "name":"Dough",
                    "itemListElement":[
                      {"@type":"HowToStep","text":"Cream butter and brown sugar."},
                      {"@type":"HowToStep","text":"Fold in flour."}
                    ]
                  },
                  {"@type":"HowToStep","text":"Bake for 12 minutes."}
                ]
              }
            ]
          }
          </script>
        </head>
      </html>
    `;
    const recipe = extractRecipeFromHtml(
      html,
      "https://food.test/best-cookies?tracking=1"
    );

    expect(recipe.title).toBe("Chocolate Chip Cookies");
    expect(recipe.source.author).toBe("Ada Baker");
    expect(recipe.source.siteName).toBe("Test Kitchen");
    expect(recipe.source.url).toBe("https://food.test/best-cookies");
    expect(recipe.prepTime).toBe("15 min");
    expect(recipe.ingredients).toHaveLength(3);
    expect(recipe.instructions).toEqual([
      "Cream butter and brown sugar.",
      "Fold in flour.",
      "Bake for 12 minutes."
    ]);
  });

  it("uses schema microdata when JSON-LD is absent", () => {
    const html = `
      <html><head><meta property="og:title" content="Simple Soup"></head>
      <body itemscope itemtype="https://schema.org/Recipe">
        <span itemprop="recipeIngredient">2 cups stock</span>
        <span itemprop="recipeIngredient">1 cup carrots</span>
        <div itemprop="recipeInstructions">Simmer the stock and carrots.</div>
      </body></html>
    `;
    const recipe = extractRecipeFromHtml(html, "https://soups.example.org/a");
    expect(recipe.title).toBe("Simple Soup");
    expect(recipe.ingredients).toEqual(["2 cups stock", "1 cup carrots"]);
    expect(recipe.instructions).toEqual(["Simmer the stock and carrots."]);
  });

  it("rejects pages with no actual recipe structure", () => {
    expect(() =>
      extractRecipeFromHtml(
        "<html><title>A very long food essay</title><p>No recipe here.</p></html>",
        "https://example.org/post"
      )
    ).toThrow(/No structured recipe card/);
  });
});
