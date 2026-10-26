import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 text-center">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            That page doesn&apos;t exist or has moved. The Community Board lives on the home page.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild className="rounded-xl"><Link href="/">Browse Events</Link></Button>
            <Button asChild variant="outline" className="rounded-xl"><Link href="/organizers">For Organizers</Link></Button>
            <Button asChild variant="ghost" className="rounded-xl"><Link href="/faq">FAQ / Help</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
