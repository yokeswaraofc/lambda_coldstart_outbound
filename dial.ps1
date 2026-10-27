param (
    [Parameter(Mandatory=$true)][string]$To,
    [Parameter(Mandatory=$true)][string]$From
)

aws connect start-outbound-voice-contact `
    --region us-west-2 `
    --destination-phone-number $To `
    --contact-flow-id "e24c65db-9dc7-42ad-ac1d-869831618b09" `
    --instance-id "ac26ef68-4aba-484c-ba31-e0acc1cb3683" `
    --source-phone-number $From






    
#	+1 844-772-8566
