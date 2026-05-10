import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateLeadNoteDto {
    @IsString()
    @IsNotEmpty()
    note_text: string;

    @IsInt()
    @Min(1)
    id_lead: number;
}
