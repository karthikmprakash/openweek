import { listMembers } from "@/lib/credits";
import { getDb } from "@/lib/db";
import { currentStaff } from "@/server/session";

export default async function MembersPage() {
  const staff = await currentStaff();
  if (!staff) return null;
  const members = listMembers(getDb(), staff.studioId, new Date());
  return (
    <div className="stack">
      <h1>Members</h1>
      {members.length === 0 ? <p className="muted">Names show up when someone books or you give them a pass.</p> : null}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Active passes</th>
            <th>Reminders</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td style={{ overflowWrap: "anywhere" }}>{member.name}</td>
              <td style={{ overflowWrap: "anywhere" }}>{member.email}</td>
              <td>{member.active_passes}</td>
              <td>{member.email_opt_out ? "Opted out" : "On"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
