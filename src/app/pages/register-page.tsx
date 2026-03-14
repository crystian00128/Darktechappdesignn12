import { useParams } from "react-router";
import { RegisterFlow } from "../components/register-flow";

export function RegisterPage() {
  const { type } = useParams<{ type: string }>();

  const handleComplete = () => {
    console.log("Cadastro completo!");
  };

  return (
    <RegisterFlow
      userType={type as "vendedor" | "cliente" | "motorista"}
      onComplete={handleComplete}
    />
  );
}
