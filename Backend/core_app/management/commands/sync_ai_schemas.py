from django.core.management.base import BaseCommand
from core_app.models import CompanySchemaSetup, CompanySchema

class Command(BaseCommand):
    help = 'Syncs existing CompanySchemaSetup JSON data to the new AI CompanySchema table.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Starting AI Schema Sync...'))
        
        setups = CompanySchemaSetup.objects.all()
        count = 0
        
        for setup in setups:
            company = setup.company
            
            # 1. Product Schema
            if setup.product_schema:
                CompanySchema.objects.update_or_create(
                    company=company, module_name='Product',
                    defaults={'schema_json': {'fields': setup.product_schema}}
                )
            
            # 2. Party Schema
            if setup.party_schema:
                CompanySchema.objects.update_or_create(
                    company=company, module_name='Party',
                    defaults={'schema_json': {'fields': setup.party_schema}}
                )
                
            # 3. Order Schema
            if setup.order_schema:
                CompanySchema.objects.update_or_create(
                    company=company, module_name='Order',
                    defaults={'schema_json': {'fields': setup.order_schema}}
                )
                
            count += 1
            self.stdout.write(f"Synced schema for company: {company.name}")

        self.stdout.write(self.style.SUCCESS(f'✅ Successfully synced AI schemas for {count} companies!'))