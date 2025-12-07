import { createClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";

const {
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_PUBLISHABLE_KEY: supabaseServiceKey,
} = process.env;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const cutoff = DateTime.now().minus({ hours: 24 }).toISO();
  console.log(`Cleanup started. Deleting data older than ${cutoff}`);

  try {
    // Delete votes older than 24 hours
    const { data: deletedVotes, error: votesError } = await supabase
      .from("votes")
      .delete()
      .lt("created_at", cutoff)
      .select();

    if (votesError) {
      console.error("Error deleting votes:", votesError.message);
    } else {
      console.log(
        `Successfully deleted ${deletedVotes?.length || 0} old votes.`,
      );
    }

    // Delete players older than 24 hours
    const { data: deletedPlayers, error: playersError } = await supabase
      .from("players")
      .delete()
      .lt("joined_at", cutoff)
      .select();

    if (playersError) {
      console.error("Error deleting players:", playersError.message);
    } else {
      console.log(
        `Successfully deleted ${deletedPlayers?.length || 0} old players.`,
      );
    }

    // Delete rooms older than 24 hours
    const { data: deletedRooms, error: roomsError } = await supabase
      .from("rooms")
      .delete()
      .lt("created_at", cutoff)
      .select();

    if (roomsError) {
      console.error("Error deleting rooms:", roomsError.message);
    } else {
      console.log(
        `Successfully deleted ${deletedRooms?.length || 0} old rooms.`,
      );
    }

    // Delete old users from Auth
    const { data: users, error: usersError } =
      await supabase.auth.admin.listUsers();
    if (usersError) {
      console.error("Error listing users:", usersError.message);
    } else {
      const oldUsers = users.users.filter(
        (user) =>
          DateTime.fromISO(user.created_at) <
          DateTime.now().minus({ hours: 24 }),
      );

      console.log(`Found ${oldUsers.length} old users to delete.`);

      for (const user of oldUsers) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(
          user.id,
        );
        if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError.message);
        } else {
          console.log(`Deleted user ${user.id}`);
        }
      }
    }

    console.log("Cleanup completed successfully.");
  } catch (error) {
    console.error("Unexpected error during cleanup:", error);
    process.exit(1);
  }
}

await main();
