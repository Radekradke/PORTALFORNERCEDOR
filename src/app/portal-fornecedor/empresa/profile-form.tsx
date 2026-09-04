"use client";

import { useFormState } from "react-dom";
import { updateOwnProfileAction, type ActionState } from "@/modules/suppliers/actions/supplier-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormError } from "@/components/ui/form-error";

const initialState: ActionState = {};

interface SupplierProfile {
  id: string;
  legalName: string;
  tradeName: string | null;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  website: string | null;
  companySize: string | null;
  registeredStatusInformed: string | null;
  addressZip: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
}

export function ProfileForm({ supplier }: { supplier: SupplierProfile }) {
  const [state, formAction] = useFormState(updateOwnProfileAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="supplierId" value={supplier.id} />
      <FormError message={state.error} />
      {state.success && (
        <p className="text-sm text-success" role="status">
          Dados salvos.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="legalName">Razão social</Label>
        <Input id="legalName" name="legalName" defaultValue={supplier.legalName} required aria-required="true" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tradeName">Nome fantasia</Label>
        <Input id="tradeName" name="tradeName" defaultValue={supplier.tradeName ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stateRegistration">Inscrição estadual</Label>
          <Input id="stateRegistration" name="stateRegistration" defaultValue={supplier.stateRegistration ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="municipalRegistration">Inscrição municipal</Label>
          <Input
            id="municipalRegistration"
            name="municipalRegistration"
            defaultValue={supplier.municipalRegistration ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="website">Site</Label>
          <Input id="website" name="website" defaultValue={supplier.website ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="companySize">Porte</Label>
          <Input id="companySize" name="companySize" defaultValue={supplier.companySize ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="registeredStatusInformed">Situação cadastral (informada por você)</Label>
        <Input
          id="registeredStatusInformed"
          name="registeredStatusInformed"
          defaultValue={supplier.registeredStatusInformed ?? ""}
        />
      </div>

      <fieldset className="flex flex-col gap-3 rounded-md border p-3">
        <legend className="px-1 text-sm font-medium">Endereço</legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressZip">CEP</Label>
            <Input id="addressZip" name="addressZip" defaultValue={supplier.addressZip ?? ""} required aria-required="true" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressStreet">Logradouro</Label>
            <Input
              id="addressStreet"
              name="addressStreet"
              defaultValue={supplier.addressStreet ?? ""}
              required
              aria-required="true"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressNumber">Número</Label>
            <Input id="addressNumber" name="addressNumber" defaultValue={supplier.addressNumber ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressComplement">Complemento</Label>
            <Input id="addressComplement" name="addressComplement" defaultValue={supplier.addressComplement ?? ""} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressDistrict">Bairro</Label>
            <Input id="addressDistrict" name="addressDistrict" defaultValue={supplier.addressDistrict ?? ""} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressCity">Cidade</Label>
            <Input
              id="addressCity"
              name="addressCity"
              defaultValue={supplier.addressCity ?? ""}
              required
              aria-required="true"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="addressState">UF</Label>
            <Input
              id="addressState"
              name="addressState"
              maxLength={2}
              defaultValue={supplier.addressState ?? ""}
              required
              aria-required="true"
            />
          </div>
        </div>
      </fieldset>

      <SubmitButton className="self-start">Salvar rascunho</SubmitButton>
    </form>
  );
}
