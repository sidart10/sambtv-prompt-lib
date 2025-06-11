import PromptExplorer from "@/components/prompt-explorer/PromptExplorer";
import { auth } from "@/lib/auth";
import { fetchPrompts, getCategories } from "@/app/actions/prompts";

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  // Fetch prompts and categories with error handling
  let prompts = [];
  let categories = [];
  
  try {
    const results = await Promise.all([
      fetchPrompts({ page: 1, limit: 20, user_id: user?.id }),
      getCategories()
    ]);
    prompts = results[0].prompts;
    categories = results[1];
  } catch (error) {
    console.error('Error fetching data:', error);
    // Use default empty arrays if database isn't set up yet
    prompts = [];
    categories = [];
  }

  return (
    <PromptExplorer 
      user={user} 
      prompts={prompts} 
      categories={categories}
    />
  );
}
