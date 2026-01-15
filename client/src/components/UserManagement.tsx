import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function UserManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          Admin user management is not enabled in this build.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          This component previously depended on `trpc.admin.*` routes, which are
          not present on the current server router.
        </div>
      </CardContent>
    </Card>
  );
}
