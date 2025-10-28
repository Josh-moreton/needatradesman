import { PrismaClient, Region, TradeCategory, VerificationType } from '@prisma/client'
import verificationMatrix from '../src/lib/verification-matrix.json'

const prisma = new PrismaClient()

interface MatrixRegionRules {
  required: string[]
  optional: string[]
}

interface MatrixCategoryRules {
  [region: string]: MatrixRegionRules | undefined
}

interface MatrixData {
  version: string
  matrix: {
    [category: string]: MatrixCategoryRules
  }
}

async function main() {
  console.log('Seeding job visibility rules...')

  const matrix = verificationMatrix as MatrixData
  let created = 0
  let skipped = 0

  for (const [categoryKey, categoryRules] of Object.entries(matrix.matrix)) {
    const category = categoryKey as TradeCategory

    for (const [regionKey, regionRules] of Object.entries(categoryRules)) {
      if (!regionRules) continue

      // Handle 'ALL' region - create rules for all regions
      const regions: Region[] = regionKey === 'ALL' 
        ? ['ENG_WLS', 'SCT', 'NI']
        : [regionKey as Region]

      for (const region of regions) {
        const requiredTypes = regionRules.required as VerificationType[]

        // Check if rule already exists
        const existing = await prisma.jobVisibilityRule.findUnique({
          where: {
            category_region: {
              category,
              region,
            },
          },
        })

        if (existing) {
          console.log(`  Skipping existing rule: ${category} @ ${region}`)
          skipped++
          continue
        }

        // Create the rule
        await prisma.jobVisibilityRule.create({
          data: {
            category,
            region,
            requiredTypes,
          },
        })

        console.log(`  ✓ Created rule: ${category} @ ${region} (requires: ${requiredTypes.join(', ')})`)
        created++
      }
    }
  }

  console.log(`\nSeeding complete: ${created} rules created, ${skipped} skipped`)
}

main()
  .catch((e) => {
    console.error('Error seeding job visibility rules:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
