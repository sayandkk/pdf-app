import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: "primary" | "accent" | "warning" | "success";
  isPopular?: boolean;
  onClick: () => void;
}

const colorClasses = {
  primary: "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
  accent: "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20",
  warning: "bg-warning/10 text-warning border-warning/20 hover:bg-warning/20",
  success: "bg-success/10 text-success border-success/20 hover:bg-success/20",
};

const iconColorClasses = {
  primary: "text-primary",
  accent: "text-accent",
  warning: "text-warning",
  success: "text-success",
};

export const ServiceCard = ({
  title,
  description,
  icon: Icon,
  color,
  isPopular,
  onClick,
}: ServiceCardProps) => {
  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
        "bg-card border border-border hover:border-primary/30"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "p-3 rounded-lg transition-colors duration-300",
              colorClasses[color],
              "group-hover:scale-110 group-hover:shadow-md"
            )}
          >
            <Icon className={cn("h-6 w-6", iconColorClasses[color])} />
          </div>
          {isPopular && (
            <Badge variant="secondary" className="bg-accent text-accent-foreground">
              Popular
            </Badge>
          )}
        </div>

        <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {description}
        </p>

        <Button
          variant="ghost"
          className="w-full justify-start p-0 h-auto text-sm font-medium text-primary hover:text-primary-dark"
        >
          Launch Tool →
        </Button>
      </CardContent>
    </Card>
  );
};